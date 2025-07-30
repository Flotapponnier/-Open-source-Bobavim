package game

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"boba-vim/internal/cache"
	"boba-vim/internal/config"
	"boba-vim/internal/constant"
	"boba-vim/internal/game"
	"boba-vim/internal/models"
	"boba-vim/internal/services/matchmaking"
	"boba-vim/internal/utils"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// MultiplayerGameService handles multiplayer game sessions
type MultiplayerGameService struct {
	db           *gorm.DB
	cfg          *config.Config
	activeGames  map[string]*MultiplayerGame
	matchToGame  map[string]string // Maps match ID to game ID
	gamesMutex   sync.RWMutex
	wsManager    *matchmaking.WebSocketManager
	ctx          context.Context
	cancel       context.CancelFunc
	cleanupTimer *time.Timer
	
	// Performance optimizations
	gameStatePool     sync.Pool
	positionPool      sync.Pool
	updateWorkerPool  chan func()
	dbWorkerPool      chan func()
	cache            *cache.RedisCache
}

// MultiplayerGame represents an active multiplayer game
type MultiplayerGame struct {
	ID                     string
	Player1ID              uint
	Player1Username        string
	Player1Character       string
	Player1Position        Position
	Player1PreferredColumn int
	Player1Score           int
	Player2ID              uint
	Player2Username        string
	Player2Character       string
	Player2Position        Position
	Player2PreferredColumn int
	Player2Score           int
	MapID                  int
	GameMap                *constant.Map
	CreatedAt              time.Time
	LastActivity           time.Time
	GameState              *game.GameState
	Winner                 *uint
	IsCompleted            bool
	SessionToken           string
	CountdownActive        bool
	CountdownValue         int
	CountdownStarted       bool // Prevent multiple countdown triggers
	mutex                  sync.RWMutex
}

// Position represents a player's position
type Position struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// MultiplayerGameMessage represents messages sent between players
type MultiplayerGameMessage struct {
	Type      string      `json:"type"`
	PlayerID  uint        `json:"player_id"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// GameUpdateData represents game state updates
type GameUpdateData struct {
	Player1Position Position `json:"player1_position"`
	Player1Score    int      `json:"player1_score"`
	Player2Position Position `json:"player2_position"`
	Player2Score    int      `json:"player2_score"`
	PearlPosition   Position `json:"pearl_position"`
	GameState       string   `json:"game_state"`
}

// NewMultiplayerGameService creates a new multiplayer game service
func NewMultiplayerGameService(db *gorm.DB, cfg *config.Config, wsManager *matchmaking.WebSocketManager) *MultiplayerGameService {
	ctx, cancel := context.WithCancel(context.Background())
	
	// Create WebSocket manager if not provided
	if wsManager == nil {
		wsManager = matchmaking.NewWebSocketManager()
	}
	
	mgs := &MultiplayerGameService{
		db:          db,
		cfg:         cfg,
		activeGames: make(map[string]*MultiplayerGame),
		matchToGame: make(map[string]string),
		wsManager:   wsManager,
		ctx:         ctx,
		cancel:      cancel,
		cache:       cache.GlobalCache,
	}
	
	// Initialize object pools for better memory management
	mgs.gameStatePool = sync.Pool{
		New: func() interface{} {
			return &GameUpdateData{}
		},
	}
	
	mgs.positionPool = sync.Pool{
		New: func() interface{} {
			return &Position{}
		},
	}
	
	// Initialize worker pools to prevent goroutine explosion
	mgs.updateWorkerPool = make(chan func(), 100)  // Buffer for 100 update tasks
	mgs.dbWorkerPool = make(chan func(), 50)       // Buffer for 50 database tasks
	
	// Start worker goroutines
	mgs.startWorkerPools()
	
	// Start cleanup routine
	go mgs.cleanupExpiredGames()
	
	// Start periodic game state broadcasting
	go mgs.periodicGameStateBroadcast()
	
	return mgs
}

// startWorkerPools initializes worker goroutines to handle tasks efficiently
func (mgs *MultiplayerGameService) startWorkerPools() {
	// Start update workers (for WebSocket broadcasts)
	numUpdateWorkers := 30
	for i := 0; i < numUpdateWorkers; i++ {
		go func() {
			for {
				select {
				case task := <-mgs.updateWorkerPool:
					func() {
						defer func() {
							if r := recover(); r != nil {
								utils.Error("Update worker panic recovered: %v", r)
							}
						}()
						task()
					}()
				case <-mgs.ctx.Done():
					return
				}
			}
		}()
	}
	
	// Start database workers (for database operations)
	numDBWorkers := 15
	for i := 0; i < numDBWorkers; i++ {
		go func() {
			for {
				select {
				case task := <-mgs.dbWorkerPool:
					func() {
						defer func() {
							if r := recover(); r != nil {
								utils.Error("DB worker panic recovered: %v", r)
							}
						}()
						task()
					}()
				case <-mgs.ctx.Done():
					return
				}
			}
		}()
	}
	
	utils.Info("Worker pools initialized: %d update workers, %d database workers", numUpdateWorkers, numDBWorkers)
}

// StartMultiplayerGame creates a new multiplayer game from a match
func (mgs *MultiplayerGameService) StartMultiplayerGame(matchID string, player1ID uint, player1Username, player1Character string, player2ID uint, player2Username, player2Character string) (interface{}, error) {
	// Generate unique game session ID
	gameID := uuid.New().String()
	sessionToken := uuid.New().String()
	
	// Randomly select a map (you can implement map selection logic here)
	selectedMap := constant.GAME_MAPS[rand.Intn(len(constant.GAME_MAPS))]
	
	// Create game state using the text pattern
	mapContent := game.CreateTextGridFromString(selectedMap.TextPattern)
	utils.Debug("selectedMap: %s, mapContent length: %d", selectedMap.Name, len(mapContent))
	if len(mapContent) > 0 {
		utils.Debug("mapContent[0] length: %d", len(mapContent[0]))
	}
	gameState := game.NewGameState(mapContent, selectedMap.ID)
	
	// Determine random starting positions with safe bounds checking
	var player1Pos, player2Pos Position
	
	// Validate map content is not empty
	if len(mapContent) == 0 {
		return nil, fmt.Errorf("empty map content")
	}
	
	maxCol := 0
	
	// Find the maximum column across all rows
	for _, row := range mapContent {
		if len(row) > maxCol {
			maxCol = len(row)
		}
	}
	
	// Validate there are columns
	if maxCol == 0 {
		return nil, fmt.Errorf("map has no columns")
	}
	
	maxCol = maxCol - 1 // Convert to 0-based index
	
	// Find non-empty rows for player placement
	firstNonEmptyRow := -1
	lastNonEmptyRow := -1
	
	// Find first non-empty row
	for i := 0; i < len(mapContent); i++ {
		if len(mapContent[i]) > 0 {
			firstNonEmptyRow = i
			break
		}
	}
	
	// Find last non-empty row
	for i := len(mapContent) - 1; i >= 0; i-- {
		if len(mapContent[i]) > 0 {
			lastNonEmptyRow = i
			break
		}
	}
	
	// Validate we found non-empty rows
	if firstNonEmptyRow == -1 || lastNonEmptyRow == -1 {
		utils.Error("No non-empty rows found in map")
		return nil, fmt.Errorf("no non-empty rows found in map")
	}
	
	firstRowMaxCol := len(mapContent[firstNonEmptyRow]) - 1
	lastRowMaxCol := len(mapContent[lastNonEmptyRow]) - 1
	
	utils.Debug("firstNonEmptyRow: %d, lastNonEmptyRow: %d, firstRowMaxCol: %d, lastRowMaxCol: %d", 
		firstNonEmptyRow, lastNonEmptyRow, firstRowMaxCol, lastRowMaxCol)
	
	if rand.Float32() < 0.5 {
		// Player 1 starts at top-left, Player 2 at bottom-right
		player1Pos = Position{Row: firstNonEmptyRow, Col: 0}
		player2Pos = Position{Row: lastNonEmptyRow, Col: lastRowMaxCol}
	} else {
		// Player 2 starts at top-left, Player 1 at bottom-right
		player2Pos = Position{Row: firstNonEmptyRow, Col: 0}
		player1Pos = Position{Row: lastNonEmptyRow, Col: lastRowMaxCol}
	}
	
	// Create multiplayer game
	mpGame := &MultiplayerGame{
		ID:                     gameID,
		Player1ID:              player1ID,
		Player1Username:        player1Username,
		Player1Character:       player1Character,
		Player1Position:        player1Pos,
		Player1PreferredColumn: player1Pos.Col, // Initialize with starting column
		Player1Score:           0,
		Player2ID:              player2ID,
		Player2Username:        player2Username,
		Player2Character:       player2Character,
		Player2Position:        player2Pos,
		Player2PreferredColumn: player2Pos.Col, // Initialize with starting column
		Player2Score:           0,
		MapID:                  selectedMap.ID,
		GameMap:                &selectedMap,
		CreatedAt:              time.Now(),
		LastActivity:           time.Now(),
		GameState:              gameState,
		IsCompleted:            false,
		SessionToken:           sessionToken,
		CountdownActive:        true,
		CountdownValue:         3,
		CountdownStarted:       false,
	}
	
	// Set initial player positions in game state
	gameState.SetPlayerPosition(player1Pos.Row, player1Pos.Col)
	gameState.SetPlayer2Position(player2Pos.Row, player2Pos.Col)
	
	// Update game map to show both players
	gameMap := gameState.GetGameMap()
	utils.Debug("gameMap length: %d, player1Pos: %+v, player2Pos: %+v", len(gameMap), player1Pos, player2Pos)
	
	// Safety check before accessing gameMap
	if len(gameMap) == 0 {
		utils.Error("gameMap is empty! mapContent length was: %d", len(mapContent))
		return nil, fmt.Errorf("game map is empty after initialization")
	}
	
	// Check if positions are within bounds
	if player1Pos.Row >= len(gameMap) || player1Pos.Row < 0 {
		utils.Error("player1Pos row out of bounds: %+v, gameMap size: %d", player1Pos, len(gameMap))
		return nil, fmt.Errorf("player1 position row out of bounds")
	}
	
	if len(gameMap[player1Pos.Row]) == 0 || player1Pos.Col >= len(gameMap[player1Pos.Row]) || player1Pos.Col < 0 {
		utils.Error("player1Pos col out of bounds: %+v, row length: %d", player1Pos, len(gameMap[player1Pos.Row]))
		return nil, fmt.Errorf("player1 position col out of bounds")
	}
	
	if player2Pos.Row >= len(gameMap) || player2Pos.Row < 0 {
		utils.Error("player2Pos row out of bounds: %+v, gameMap size: %d", player2Pos, len(gameMap))
		return nil, fmt.Errorf("player2 position row out of bounds")
	}
	
	if len(gameMap[player2Pos.Row]) == 0 || player2Pos.Col >= len(gameMap[player2Pos.Row]) || player2Pos.Col < 0 {
		utils.Error("player2Pos col out of bounds: %+v, row length: %d", player2Pos, len(gameMap[player2Pos.Row]))
		return nil, fmt.Errorf("player2 position col out of bounds")
	}
	
	gameMap[player1Pos.Row][player1Pos.Col] = 1 // Player 1
	gameMap[player2Pos.Row][player2Pos.Col] = 2 // Player 2 (different value)
	
	// Add to active games and match mapping
	mgs.gamesMutex.Lock()
	mgs.activeGames[gameID] = mpGame
	mgs.matchToGame[matchID] = gameID
	mgs.gamesMutex.Unlock()
	
	// Cache game state in Redis for faster access
	if mgs.cache != nil && mgs.cache.IsAvailable() {
		gameStateData := mgs.getGameStateData(mpGame)
		cacheKey := cache.GetActiveGameKey(gameID)
		if err := mgs.cache.Set(cacheKey, gameStateData, 10*time.Minute); err != nil {
			utils.Error("Failed to cache game state: %v", err)
		}
	}
	
	// Create database record asynchronously to avoid blocking
	select {
	case mgs.dbWorkerPool <- func() {
		dbGame := &models.GameSession{
			SessionToken:     sessionToken,
			PlayerID:         &player1ID,
			MapID:            selectedMap.ID,
			SelectedCharacter: player1Character,
			IsActive:         true,
			IsCompleted:      false,
			IsMultiplayer:    true,
			MultiplayerGameID: &gameID,
		}
		
		if err := mgs.db.Create(dbGame).Error; err != nil {
			utils.Error("Failed to create database record for multiplayer game: %v", err)
		}
	}:
	default:
		// If worker pool is full, do it synchronously
		dbGame := &models.GameSession{
			SessionToken:     sessionToken,
			PlayerID:         &player1ID,
			MapID:            selectedMap.ID,
			SelectedCharacter: player1Character,
			IsActive:         true,
			IsCompleted:      false,
			IsMultiplayer:    true,
			MultiplayerGameID: &gameID,
		}
		
		if err := mgs.db.Create(dbGame).Error; err != nil {
			utils.Error("Failed to create database record for multiplayer game: %v", err)
		}
	}
	
	// Send game start notifications
	mgs.sendGameStartNotifications(mpGame)
	
	// Don't start countdown automatically - wait for players to connect via WebSocket
	// Countdown will be triggered when the first player connects
	
	utils.Info("Multiplayer game %s started between %s and %s", gameID, player1Username, player2Username)
	utils.Info("Match ID %s mapped to game ID %s", matchID, gameID)
	return mpGame, nil
}

// ProcessMove processes a move in a multiplayer game
func (mgs *MultiplayerGameService) ProcessMove(gameID string, playerID uint, direction string, count int, hasExplicitCount bool) (map[string]interface{}, error) {
	// Get game reference with read lock
	mgs.gamesMutex.RLock()
	mpGame, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		return map[string]interface{}{
			"success": false,
			"error":   "Game not found",
		}, nil
	}
	
	// Check if countdown is active - block movement during countdown
	if mgs.IsCountdownActive(gameID) {
		utils.Debug("🚫 Movement blocked for player %d in game %s - countdown active", playerID, gameID)
		return map[string]interface{}{
			"success": false,
			"error":   "Movement blocked during countdown",
			"countdown_active": true,
		}, nil
	}
	
	// Use individual game lock for move processing
	mpGame.mutex.Lock()
	defer mpGame.mutex.Unlock()
	
	// Check if game is completed
	if mpGame.IsCompleted {
		return map[string]interface{}{
			"success": false,
			"error":   "Game already completed",
		}, nil
	}
	
	// Check if countdown is active - block moves during countdown
	if mpGame.CountdownActive {
		return map[string]interface{}{
			"success": false,
			"error":   "Game is starting, please wait for countdown to finish",
		}, nil
	}
	
	// Update last activity
	mpGame.LastActivity = time.Now()
	
	// Validate direction first
	validatedDirection, err := mgs.validateDirection(direction)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}, nil
	}
	
	// Determine which player is moving
	var currentPos *Position
	var currentScore *int
	var currentPreferredColumn *int
	isPlayer1 := playerID == mpGame.Player1ID
	
	if isPlayer1 {
		currentPos = &mpGame.Player1Position
		currentScore = &mpGame.Player1Score
		currentPreferredColumn = &mpGame.Player1PreferredColumn
	} else if playerID == mpGame.Player2ID {
		currentPos = &mpGame.Player2Position
		currentScore = &mpGame.Player2Score
		currentPreferredColumn = &mpGame.Player2PreferredColumn
	} else {
		return map[string]interface{}{
			"success": false,
			"error":   "Player not in this game",
		}, nil
	}
	
	// Process the move using the existing game logic
	oldRow, oldCol := currentPos.Row, currentPos.Col
	newRow, newCol, newPreferredColumn, moveScore := game.ProcessMove(mpGame.GameState, oldRow, oldCol, validatedDirection, count, hasExplicitCount, *currentPreferredColumn)
	
	// Only update if the move was valid (position changed or stayed same for valid reasons)
	if newRow != oldRow || newCol != oldCol || moveScore > 0 {
		// Update player position, preferred column, and score
		currentPos.Row = newRow
		currentPos.Col = newCol
		*currentPreferredColumn = newPreferredColumn
		*currentScore += moveScore
		
		// Update game state
		if isPlayer1 {
			mpGame.GameState.SetPlayerPosition(newRow, newCol)
		} else {
			mpGame.GameState.SetPlayer2Position(newRow, newCol)
		}
		
		// Update game map to show both players correctly
		gameMap := mpGame.GameState.GetGameMap()
		// Clear old positions
		for row := 0; row < len(gameMap); row++ {
			for col := 0; col < len(gameMap[row]); col++ {
				if gameMap[row][col] == 1 || gameMap[row][col] == 2 {
					gameMap[row][col] = 0
				}
			}
		}
		// Set new positions
		gameMap[mpGame.Player1Position.Row][mpGame.Player1Position.Col] = 1 // Player 1
		gameMap[mpGame.Player2Position.Row][mpGame.Player2Position.Col] = 2 // Player 2
		// Pearl position is handled separately by the game state
		
		// Check win condition (1300 points) - do this before sending updates
		gameCompleted := *currentScore >= 1300
		if gameCompleted {
			mpGame.IsCompleted = true
			mpGame.Winner = &playerID
		}
		
		// Create response data
		responseData := map[string]interface{}{
			"success": true,
			"game_id": mpGame.ID,
			"map": map[string]interface{}{
				"id":      mpGame.MapID,
				"content": mpGame.GameMap.TextPattern,
				"name":    mpGame.GameMap.Name,
			},
			"text_grid": mpGame.GameState.GetTextGrid(),
			"game_map":  mpGame.GameState.GetGameMap(),
			"player1": map[string]interface{}{
				"id":        mpGame.Player1ID,
				"username":  mpGame.Player1Username,
				"character": mpGame.Player1Character,
				"position":  mpGame.Player1Position,
				"score":     mpGame.Player1Score,
			},
			"player2": map[string]interface{}{
				"id":        mpGame.Player2ID,
				"username":  mpGame.Player2Username,
				"character": mpGame.Player2Character,
				"position":  mpGame.Player2Position,
				"score":     mpGame.Player2Score,
			},
			"pearl_position": mpGame.GameState.GetPearlPosition(),
			"is_completed":   mpGame.IsCompleted,
			"winner":         mpGame.Winner,
			"current_player": playerID,
			"move_score":     moveScore,
			"completed":      mpGame.IsCompleted,
		}
		
		// Send updates to both players using worker pool to prevent goroutine explosion
		select {
		case mgs.updateWorkerPool <- func() {
			mgs.sendGameUpdate(mpGame)
		}:
		default:
			// If worker pool is full, do it synchronously to avoid blocking
			mgs.sendGameUpdate(mpGame)
		}
		
		// Handle game completion using worker pool
		if gameCompleted {
			select {
			case mgs.dbWorkerPool <- func() {
				mgs.handleGameCompletion(mpGame)
			}:
			default:
				// If worker pool is full, do it synchronously
				go mgs.handleGameCompletion(mpGame)
			}
		}
		
		return responseData, nil
	} else {
		// Invalid move - return error
		return map[string]interface{}{
			"success": false,
			"error":   "Invalid move",
			"game_map": mpGame.GameState.GetGameMap(),
			"player_pos": map[string]int{
				"row": oldRow,
				"col": oldCol,
			},
			"score": *currentScore,
		}, nil
	}
}

// GetGameState returns the current state of a multiplayer game
func (mgs *MultiplayerGameService) GetGameState(gameID string, playerID uint) (map[string]interface{}, error) {
	// Try to get from cache first
	if mgs.cache != nil && mgs.cache.IsAvailable() {
		cacheKey := cache.GetActiveGameKey(gameID)
		var cachedData GameUpdateData
		if err := mgs.cache.Get(cacheKey, &cachedData); err == nil {
			// Return cached data directly - player validation will happen in fallback
			return map[string]interface{}{
				"success": true,
				"game_id": gameID,
				"cached":  true,
				"player1": map[string]interface{}{
					"position": cachedData.Player1Position,
					"score":    cachedData.Player1Score,
				},
				"player2": map[string]interface{}{
					"position": cachedData.Player2Position,
					"score":    cachedData.Player2Score,
				},
				"pearl_position": cachedData.PearlPosition,
				"game_state":     cachedData.GameState,
				"current_player": playerID,
			}, nil
		}
	}
	
	// Fallback to database/memory lookup
	mgs.gamesMutex.RLock()
	mpGame, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		return map[string]interface{}{
			"success": false,
			"error":   "Game not found",
		}, nil
	}
	
	mpGame.mutex.RLock()
	defer mpGame.mutex.RUnlock()
	
	// Verify player is in this game
	if playerID != mpGame.Player1ID && playerID != mpGame.Player2ID {
		return map[string]interface{}{
			"success": false,
			"error":   "Player not in this game",
		}, nil
	}
	
	return map[string]interface{}{
		"success": true,
		"game_id": gameID,
		"map": map[string]interface{}{
			"id":      mpGame.MapID,
			"content": mpGame.GameMap.TextPattern,
			"name":    mpGame.GameMap.Name,
		},
		"text_grid": mpGame.GameState.GetTextGrid(),
		"game_map":  mpGame.GameState.GetGameMap(),
		"player1": map[string]interface{}{
			"id":        mpGame.Player1ID,
			"username":  mpGame.Player1Username,
			"character": mpGame.Player1Character,
			"position":  mpGame.Player1Position,
			"score":     mpGame.Player1Score,
		},
		"player2": map[string]interface{}{
			"id":        mpGame.Player2ID,
			"username":  mpGame.Player2Username,
			"character": mpGame.Player2Character,
			"position":  mpGame.Player2Position,
			"score":     mpGame.Player2Score,
		},
		"pearl_position": mpGame.GameState.GetPearlPosition(),
		"is_completed":   mpGame.IsCompleted,
		"winner":         mpGame.Winner,
		"current_player": playerID,
	}, nil
}

// GetGameByMatchID returns the game state using match ID
func (mgs *MultiplayerGameService) GetGameByMatchID(matchID string, playerID uint) (map[string]interface{}, error) {
	mgs.gamesMutex.RLock()
	gameID, exists := mgs.matchToGame[matchID]
	mgs.gamesMutex.RUnlock()
	
	utils.Debug("Looking for match ID %s, found: %v, game ID: %s", matchID, exists, gameID)
	utils.Debug("Current match mappings: %v", mgs.matchToGame)
	
	if !exists {
		return map[string]interface{}{
			"success": false,
			"error":   "Game not found for match ID",
		}, nil
	}
	
	// Use the game ID to get the actual game state
	return mgs.GetGameState(gameID, playerID)
}

// sendGameStartNotifications sends game start notifications to both players
func (mgs *MultiplayerGameService) sendGameStartNotifications(mpGame *MultiplayerGame) {
	message := MultiplayerGameMessage{
		Type:      "game_start",
		Data:      mgs.getGameStateData(mpGame),
		Timestamp: time.Now(),
	}
	
	mgs.wsManager.SendMessage(mpGame.Player1ID, message)
	mgs.wsManager.SendMessage(mpGame.Player2ID, message)
}

// startCountdown starts the 3-2-1 countdown sequence
func (mgs *MultiplayerGameService) startCountdown(mpGame *MultiplayerGame) {
	utils.Debug("🎯 Starting countdown for game %s", mpGame.ID)
	utils.Debug("🎯 Sending countdown to players %d and %d", mpGame.Player1ID, mpGame.Player2ID)
	
	// Send initial countdown message
	for countdown := 3; countdown > 0; countdown-- {
		mpGame.mutex.Lock()
		mpGame.CountdownValue = countdown
		mpGame.mutex.Unlock()
		
		message := MultiplayerGameMessage{
			Type: "countdown",
			Data: map[string]interface{}{
				"value": countdown,
				"active": true,
			},
			Timestamp: time.Now(),
		}
		
		utils.Debug("🔥 Sending countdown message %d to player %d", countdown, mpGame.Player1ID)
		err1 := mgs.wsManager.SendMessage(mpGame.Player1ID, message)
		if err1 != nil {
			utils.Error("❌ Failed to send countdown to player1 %d: %v", mpGame.Player1ID, err1)
		}
		
		utils.Debug("🔥 Sending countdown message %d to player %d", countdown, mpGame.Player2ID)
		err2 := mgs.wsManager.SendMessage(mpGame.Player2ID, message)
		if err2 != nil {
			utils.Error("❌ Failed to send countdown to player2 %d: %v", mpGame.Player2ID, err2)
		}
		
		utils.Debug("✅ Sent countdown %d for game %s (errors: p1=%v, p2=%v)", countdown, mpGame.ID, err1, err2)
		
		// Wait 1 second before next countdown
		time.Sleep(1 * time.Second)
	}
	
	// Send "GO" message and deactivate countdown
	mpGame.mutex.Lock()
	mpGame.CountdownActive = false
	mpGame.CountdownValue = 0
	mpGame.mutex.Unlock()
	
	message := MultiplayerGameMessage{
		Type: "countdown",
		Data: map[string]interface{}{
			"value": "GO",
			"active": false,
		},
		Timestamp: time.Now(),
	}
	
	utils.Debug("🏁 Sending GO message to players")
	err1 := mgs.wsManager.SendMessage(mpGame.Player1ID, message)
	err2 := mgs.wsManager.SendMessage(mpGame.Player2ID, message)
	
	utils.Debug("🏁 Countdown finished for game %s - game is now active (errors: p1=%v, p2=%v)", mpGame.ID, err1, err2)
}

// TriggerCountdownForGame triggers countdown for a specific game (called when players connect)
func (mgs *MultiplayerGameService) TriggerCountdownForGame(gameID string) {
	mgs.gamesMutex.RLock()
	mpGame, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		utils.Error("❌ Game %s not found for countdown trigger", gameID)
		return
	}
	
	mpGame.mutex.Lock()
	countdownActive := mpGame.CountdownActive
	countdownStarted := mpGame.CountdownStarted
	
	if countdownActive && !countdownStarted {
		mpGame.CountdownStarted = true
		mpGame.mutex.Unlock()
		utils.Debug("🎯 Triggering countdown for game %s", gameID)
		mgs.startCountdown(mpGame)
	} else {
		mpGame.mutex.Unlock()
		if countdownStarted {
			utils.Debug("⏰ Countdown already started for game %s", gameID)
		} else {
			utils.Debug("⏰ Countdown already finished for game %s", gameID)
		}
	}
}

// sendGameUpdate sends game state updates to both players
func (mgs *MultiplayerGameService) sendGameUpdate(mpGame *MultiplayerGame) {
	// Take a read lock to safely access game data
	mpGame.mutex.RLock()
	
	// Get reusable data from pool
	gameStateData := mgs.gameStatePool.Get().(*GameUpdateData)
	defer func() {
		// Reset and return to pool
		*gameStateData = GameUpdateData{}
		mgs.gameStatePool.Put(gameStateData)
		mpGame.mutex.RUnlock()
	}()
	
	// Populate game state data efficiently
	*gameStateData = mgs.getGameStateData(mpGame)
	
	message := MultiplayerGameMessage{
		Type:      "game_update",
		Data:      *gameStateData,
		Timestamp: time.Now(),
	}
	
	// Update cache if available
	if mgs.cache != nil && mgs.cache.IsAvailable() {
		cacheKey := cache.GetActiveGameKey(mpGame.ID)
		// Non-blocking cache update
		go func() {
			if err := mgs.cache.Set(cacheKey, *gameStateData, 10*time.Minute); err != nil {
				utils.Error("Failed to update game cache: %v", err)
			}
		}()
	}
	
	// Batch message sending to reduce WebSocket overhead
	players := []uint{mpGame.Player1ID, mpGame.Player2ID}
	
	// Send messages concurrently but with controlled concurrency
	var wg sync.WaitGroup
	for _, playerID := range players {
		wg.Add(1)
		go func(pID uint) {
			defer wg.Done()
			if err := mgs.wsManager.SendMessage(pID, message); err != nil {
				utils.Error("Failed to send game update to player %d: %v", pID, err)
			}
		}(playerID)
	}
	wg.Wait()
}

// getGameStateData returns the current game state data
func (mgs *MultiplayerGameService) getGameStateData(mpGame *MultiplayerGame) GameUpdateData {
	return GameUpdateData{
		Player1Position: mpGame.Player1Position,
		Player1Score:    mpGame.Player1Score,
		Player2Position: mpGame.Player2Position,
		Player2Score:    mpGame.Player2Score,
		PearlPosition:   Position{Row: mpGame.GameState.GetPearlPosition().Row, Col: mpGame.GameState.GetPearlPosition().Col},
		GameState:       "active",
	}
}

// handleGameCompletion handles when a game is completed
func (mgs *MultiplayerGameService) handleGameCompletion(mpGame *MultiplayerGame) {
	// Take a read lock to safely access game data
	mpGame.mutex.RLock()
	gameID := mpGame.ID
	player1ID := mpGame.Player1ID
	player1Username := mpGame.Player1Username
	player1Character := mpGame.Player1Character
	player2ID := mpGame.Player2ID
	player2Username := mpGame.Player2Username
	player2Character := mpGame.Player2Character
	winner := mpGame.Winner
	winnerScore := mgs.getWinnerScore(mpGame)
	player1Score := mpGame.Player1Score
	player2Score := mpGame.Player2Score
	createdAt := mpGame.CreatedAt
	mapID := mpGame.MapID
	mpGame.mutex.RUnlock()
	
	duration := time.Since(createdAt)
	
	// Send completion notification
	message := MultiplayerGameMessage{
		Type: "game_complete",
		Data: map[string]interface{}{
			"winner":        winner,
			"winner_score":  winnerScore,
			"player1_score": player1Score,
			"player2_score": player2Score,
			"duration":      duration,
		},
		Timestamp: time.Now(),
	}
	
	mgs.wsManager.SendMessage(player1ID, message)
	mgs.wsManager.SendMessage(player2ID, message)
	
	// Record game result in leaderboard
	mgs.recordGameResult(gameID, player1ID, player1Username, player1Character, player1Score,
		player2ID, player2Username, player2Character, player2Score, winner, uint(mapID), duration, "normal")
	
	// Update database
	mgs.db.Model(&models.GameSession{}).
		Where("multiplayer_game_id = ?", gameID).
		Updates(map[string]interface{}{
			"is_completed": true,
			"is_active":    false,
		})
	
	// Schedule cleanup
	time.AfterFunc(5*time.Minute, func() {
		mgs.cleanupGame(gameID)
	})
}

// getWinnerScore returns the winner's score
func (mgs *MultiplayerGameService) getWinnerScore(mpGame *MultiplayerGame) int {
	if mpGame.Winner == nil {
		return 0
	}
	
	if *mpGame.Winner == mpGame.Player1ID {
		return mpGame.Player1Score
	}
	return mpGame.Player2Score
}

// recordGameResult records a multiplayer game result in the database
func (mgs *MultiplayerGameService) recordGameResult(gameSessionID string, player1ID uint, player1Username, player1Character string, player1Score int, player2ID uint, player2Username, player2Character string, player2Score int, winnerID *uint, mapID uint, duration time.Duration, completionType string) {
	// Create leaderboard service
	leaderboardService := NewMultiplayerLeaderboardService(mgs.db)
	
	// Get character levels from database
	player1CharacterLevel := mgs.getCharacterLevel(player1ID, player1Character)
	player2CharacterLevel := mgs.getCharacterLevel(player2ID, player2Character)
	
	// Create game result record
	gameResult := &models.MultiplayerGameResult{
		GameSessionID:     gameSessionID,
		MatchID:           gameSessionID, // Use game session ID as match ID for now
		Player1ID:         player1ID,
		Player1Username:   player1Username,
		Player1Character:  player1Character,
		Player1CharacterLevel: player1CharacterLevel,
		Player1FinalScore: player1Score,
		Player2ID:         player2ID,
		Player2Username:   player2Username,
		Player2Character:  player2Character,
		Player2CharacterLevel: player2CharacterLevel,
		Player2FinalScore: player2Score,
		WinnerID:          winnerID,
		GameDuration:      int(duration.Seconds()),
		CompletionType:    completionType,
		MapID:             mapID,
	}
	
	// Record the result
	if err := leaderboardService.RecordGameResult(gameResult); err != nil {
		utils.Error("Error recording multiplayer game result: %v", err)
	} else {
		utils.Info("Recorded multiplayer game result for game %s", gameSessionID)
	}
}

// getCharacterLevel retrieves the character level for a player
func (mgs *MultiplayerGameService) getCharacterLevel(playerID uint, character string) *int {
	// Only boba_diamond has levels
	if character != "boba_diamond" {
		return nil
	}
	
	var ownership models.PlayerCharacterOwnership
	err := mgs.db.Where("player_id = ? AND character_name = ?", playerID, character).First(&ownership).Error
	if err != nil {
		return nil
	}
	
	return &ownership.Level
}

// cleanupGame removes a game from active games
func (mgs *MultiplayerGameService) cleanupGame(gameID string) {
	mgs.gamesMutex.Lock()
	defer mgs.gamesMutex.Unlock()
	
	if game, exists := mgs.activeGames[gameID]; exists {
		delete(mgs.activeGames, gameID)
		
		// Also remove from match mapping
		for matchID, gID := range mgs.matchToGame {
			if gID == gameID {
				delete(mgs.matchToGame, matchID)
				break
			}
		}
		
		utils.Debug("Cleaned up multiplayer game %s", gameID)
		
		// Send disconnect notifications if game was not completed
		if !game.IsCompleted {
			message := MultiplayerGameMessage{
				Type:      "game_disconnected",
				Data:      map[string]string{"reason": "Game cleanup"},
				Timestamp: time.Now(),
			}
			
			mgs.wsManager.SendMessage(game.Player1ID, message)
			mgs.wsManager.SendMessage(game.Player2ID, message)
		}
	}
}

// HandlePlayerDisconnect handles when a player disconnects
func (mgs *MultiplayerGameService) HandlePlayerDisconnect(playerID uint) {
	mgs.gamesMutex.RLock()
	var gameToCleanup *MultiplayerGame
	
	for _, game := range mgs.activeGames {
		if (game.Player1ID == playerID || game.Player2ID == playerID) && !game.IsCompleted {
			gameToCleanup = game
			break
		}
	}
	mgs.gamesMutex.RUnlock()
	
	if gameToCleanup != nil {
		gameToCleanup.mutex.Lock()
		gameToCleanup.IsCompleted = true
		
		// Record the disconnection result - other player wins by default
		gameID := gameToCleanup.ID
		player1ID := gameToCleanup.Player1ID
		player1Username := gameToCleanup.Player1Username
		player1Character := gameToCleanup.Player1Character
		player1Score := gameToCleanup.Player1Score
		player2ID := gameToCleanup.Player2ID
		player2Username := gameToCleanup.Player2Username
		player2Character := gameToCleanup.Player2Character
		player2Score := gameToCleanup.Player2Score
		createdAt := gameToCleanup.CreatedAt
		mapID := gameToCleanup.MapID
		
		// Determine winner (the player who didn't disconnect)
		var winnerID *uint
		if playerID == player1ID {
			winnerID = &player2ID
		} else {
			winnerID = &player1ID
		}
		
		gameToCleanup.Winner = winnerID
		gameToCleanup.mutex.Unlock()
		
		// Record game result
		duration := time.Since(createdAt)
		mgs.recordGameResult(gameID, player1ID, player1Username, player1Character, player1Score,
			player2ID, player2Username, player2Character, player2Score, winnerID, uint(mapID), duration, "disconnection")
		
		// Notify the other player
		otherPlayerID := gameToCleanup.Player1ID
		if playerID == gameToCleanup.Player1ID {
			otherPlayerID = gameToCleanup.Player2ID
		}
		
		message := MultiplayerGameMessage{
			Type:      "player_disconnected",
			Data:      map[string]string{"reason": "Opponent disconnected"},
			Timestamp: time.Now(),
		}
		
		mgs.wsManager.SendMessage(otherPlayerID, message)
		
		// Schedule cleanup
		time.AfterFunc(5*time.Minute, func() {
			mgs.cleanupGame(gameToCleanup.ID)
		})
	}
}

// periodicGameStateBroadcast sends game state updates at regular intervals for real-time feel
func (mgs *MultiplayerGameService) periodicGameStateBroadcast() {
	// Reduce broadcast frequency to 1 second for better performance with high concurrency
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-mgs.ctx.Done():
			return
		case <-ticker.C:
			mgs.gamesMutex.RLock()
			
			// Only broadcast if there are active games and recent activity
			if len(mgs.activeGames) > 0 {
				// Collect games that need updates to avoid holding the lock too long
				var activeGamesCopy []*MultiplayerGame
				for _, game := range mgs.activeGames {
					if !game.IsCompleted && time.Since(game.LastActivity) < 10*time.Second {
						activeGamesCopy = append(activeGamesCopy, game)
					}
				}
				mgs.gamesMutex.RUnlock()
				
				// Batch process updates using worker pool
				for _, game := range activeGamesCopy {
					select {
					case mgs.updateWorkerPool <- func(g *MultiplayerGame) func() {
						return func() {
							mgs.sendGameUpdate(g)
						}
					}(game):
						// Task queued successfully
					default:
						// Worker pool is full, skip this update cycle for this game
						// This prevents blocking and allows the system to catch up
					}
				}
			} else {
				mgs.gamesMutex.RUnlock()
			}
		}
	}
}

// cleanupExpiredGames removes games that have been inactive for too long
func (mgs *MultiplayerGameService) cleanupExpiredGames() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-mgs.ctx.Done():
			return
		case <-ticker.C:
			mgs.gamesMutex.Lock()
			now := time.Now()
			
			for gameID, game := range mgs.activeGames {
				// Clean up games inactive for more than 8 minutes (user requirement)
				if now.Sub(game.LastActivity) > 8*time.Minute {
					delete(mgs.activeGames, gameID)
					utils.Debug("Cleaned up expired multiplayer game %s after 8 minutes of inactivity", gameID)
					
					// Remove from match mapping
					for matchID, gID := range mgs.matchToGame {
						if gID == gameID {
							delete(mgs.matchToGame, matchID)
							break
						}
					}
					
					// Notify players
					message := MultiplayerGameMessage{
						Type:      "game_expired",
						Data:      map[string]string{"reason": "Game expired due to 8 minutes of inactivity"},
						Timestamp: time.Now(),
					}
					
					mgs.wsManager.SendMessage(game.Player1ID, message)
					mgs.wsManager.SendMessage(game.Player2ID, message)
				}
			}
			
			mgs.gamesMutex.Unlock()
		}
	}
}

// RegisterWebSocketConnection registers a WebSocket connection for game updates
func (mgs *MultiplayerGameService) RegisterWebSocketConnection(playerID uint, conn interface{}) {
	if wsConn, ok := conn.(*websocket.Conn); ok {
		mgs.wsManager.AddConnection(playerID, wsConn)
		utils.Debug("🔗 Registered WebSocket connection for player %d", playerID)
	}
}

// UnregisterWebSocketConnection removes a WebSocket connection
func (mgs *MultiplayerGameService) UnregisterWebSocketConnection(playerID uint) {
	mgs.wsManager.RemoveConnection(playerID)
	utils.Debug("🔌 Unregistered WebSocket connection for player %d", playerID)
}

// GetGameByID returns a game by its ID
func (mgs *MultiplayerGameService) GetGameByID(gameID string) *MultiplayerGame {
	mgs.gamesMutex.RLock()
	defer mgs.gamesMutex.RUnlock()
	
	return mgs.activeGames[gameID]
}

// AreBothPlayersConnected checks if both players of a game are connected via WebSocket
func (mgs *MultiplayerGameService) AreBothPlayersConnected(gameID string) bool {
	mgs.gamesMutex.RLock()
	game, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		return false
	}
	
	// Check if both players are connected to the WebSocket manager
	player1Connected := mgs.wsManager.IsPlayerConnected(game.Player1ID)
	player2Connected := mgs.wsManager.IsPlayerConnected(game.Player2ID)
	
	utils.Debug("🔍 Connection status for game %s: P1(%d)=%v, P2(%d)=%v", 
		gameID, game.Player1ID, player1Connected, game.Player2ID, player2Connected)
	
	return player1Connected && player2Connected
}

// StartCountdownDirectly starts countdown and sends messages directly through the WebSocket manager
func (mgs *MultiplayerGameService) StartCountdownDirectly(gameID string) {
	mgs.gamesMutex.RLock()
	game, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		utils.Error("❌ Game %s not found for countdown", gameID)
		return
	}
	
	// Check if countdown was already started to prevent duplicates
	game.mutex.Lock()
	if game.CountdownStarted {
		utils.Debug("⏭️ Countdown already started for game %s", gameID)
		game.mutex.Unlock()
		return
	}
	game.CountdownStarted = true
	game.mutex.Unlock()
	
	utils.Debug("🎯 Starting direct countdown for game %s", gameID)
	
	// Send 3-2-1 countdown
	for countdown := 3; countdown > 0; countdown-- {
		message := MultiplayerGameMessage{
			Type: "countdown",
			Data: map[string]interface{}{
				"value":  countdown,
				"active": true,
			},
			Timestamp: time.Now(),
		}
		
		utils.Debug("🔥 Sending countdown message %d to players in game %s", countdown, gameID)
		err1 := mgs.wsManager.SendMessage(game.Player1ID, message)
		err2 := mgs.wsManager.SendMessage(game.Player2ID, message)
		
		if err1 != nil {
			utils.Error("❌ Failed to send countdown to player1 %d: %v", game.Player1ID, err1)
		}
		if err2 != nil {
			utils.Error("❌ Failed to send countdown to player2 %d: %v", game.Player2ID, err2)
		}
		
		utils.Debug("✅ Sent countdown %d for game %s (errors: p1=%v, p2=%v)", countdown, gameID, err1, err2)
		time.Sleep(1 * time.Second)
	}
	
	// Send GO message
	message := MultiplayerGameMessage{
		Type: "countdown",
		Data: map[string]interface{}{
			"value":  "GO",
			"active": false,
		},
		Timestamp: time.Now(),
	}
	
	utils.Debug("🏁 Sending GO message to players in game %s", gameID)
	err1 := mgs.wsManager.SendMessage(game.Player1ID, message)
	err2 := mgs.wsManager.SendMessage(game.Player2ID, message)
	
	if err1 != nil {
		utils.Error("❌ Failed to send GO to player1 %d: %v", game.Player1ID, err1)
	}
	if err2 != nil {
		utils.Error("❌ Failed to send GO to player2 %d: %v", game.Player2ID, err2)
	}
	
	utils.Debug("🏁 Countdown finished for game %s - game is now active (errors: p1=%v, p2=%v)", gameID, err1, err2)
}

// SetCountdownState sets the countdown state for a game
func (mgs *MultiplayerGameService) SetCountdownState(gameID string, started, active bool) bool {
	mgs.gamesMutex.RLock()
	game, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		return false
	}
	
	game.mutex.Lock()
	defer game.mutex.Unlock()
	
	// If checking if countdown can be started (only prevent if trying to start a new countdown)
	if started && active && game.CountdownStarted {
		return false // Already started
	}
	
	game.CountdownStarted = started
	game.CountdownActive = active
	
	utils.Debug("🔄 Updated countdown state for game %s: started=%v, active=%v", gameID, started, active)
	return true
}

// IsCountdownActive checks if countdown is active for a game
func (mgs *MultiplayerGameService) IsCountdownActive(gameID string) bool {
	mgs.gamesMutex.RLock()
	game, exists := mgs.activeGames[gameID]
	mgs.gamesMutex.RUnlock()
	
	if !exists {
		return false
	}
	
	game.mutex.RLock()
	defer game.mutex.RUnlock()
	
	utils.Debug("🔍 Checking countdown state for game %s: started=%v, active=%v", gameID, game.CountdownStarted, game.CountdownActive)
	return game.CountdownActive
}

// GetActiveGameCount returns the number of active multiplayer games
func (mgs *MultiplayerGameService) GetActiveGameCount() int {
	mgs.gamesMutex.RLock()
	defer mgs.gamesMutex.RUnlock()
	
	return len(mgs.activeGames)
}

// Cleanup shuts down the multiplayer game service
func (mgs *MultiplayerGameService) Cleanup() {
	mgs.cancel()
	
	mgs.gamesMutex.Lock()
	defer mgs.gamesMutex.Unlock()
	
	// Clean up all active games
	for gameID := range mgs.activeGames {
		delete(mgs.activeGames, gameID)
	}
	
	// Clean up match mappings
	for matchID := range mgs.matchToGame {
		delete(mgs.matchToGame, matchID)
	}
	
	utils.Info("Multiplayer game service cleaned up")
}

// validateDirection validates and converts direction input (same as single-player)
func (mgs *MultiplayerGameService) validateDirection(direction string) (string, error) {
	// Check for empty direction string
	if direction == "" {
		return "", fmt.Errorf("empty direction string")
	}
	
	// Check if this is a character search direction
	if (len(direction) > 17 && direction[:17] == "find_char_forward") ||
		(len(direction) > 18 && direction[:18] == "find_char_backward") ||
		(len(direction) > 17 && direction[:17] == "till_char_forward") ||
		(len(direction) > 18 && direction[:18] == "till_char_backward") {
		// For character search, use the direction string directly
		return direction, nil
	}

	// Strip number prefix if present (e.g., "5j" -> "j", "123B" -> "B")
	baseDirection := direction
	for i, char := range direction {
		if char < '0' || char > '9' {
			if i < len(direction) {
				baseDirection = direction[i:]
			}
			break
		}
	}
	
	// Additional safety check for empty result
	if baseDirection == "" {
		return "", fmt.Errorf("empty direction after processing: %s", direction)
	}

	// For normal movement, look up in MovementKeys map
	directionInfo, exists := game.MovementKeys[baseDirection]
	if !exists {
		return "", fmt.Errorf("invalid movement key: %s", baseDirection)
	}
	return directionInfo["direction"].(string), nil
}