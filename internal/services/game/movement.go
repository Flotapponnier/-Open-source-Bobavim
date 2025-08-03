package game

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"boba-vim/internal/cache"
	"boba-vim/internal/config"
	"boba-vim/internal/constant"
	"boba-vim/internal/game"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"

	"gorm.io/gorm"
)

// MovementService handles move processing and validation
type MovementService struct {
	db               *gorm.DB
	cfg              *config.Config
	cache            *cache.RedisCache
	pearlMoldService *PearlMoldService
	dbWriteQueue     chan func()
	wg               sync.WaitGroup
}

// NewMovementService creates a new movement service
func NewMovementService(db *gorm.DB, cfg *config.Config, pearlMoldService *PearlMoldService) *MovementService {
	ms := &MovementService{
		db:               db,
		cfg:              cfg,
		cache:            cache.GlobalCache,
		pearlMoldService: pearlMoldService,
		dbWriteQueue:     make(chan func(), 5000), // Buffer for 5000 database operations
	}
	
	// Start async database writer workers
	numWorkers := 20
	for i := 0; i < numWorkers; i++ {
		ms.wg.Add(1)
		go ms.dbWriteWorker()
	}
	
	return ms
}

// dbWriteWorker processes database writes asynchronously
func (ms *MovementService) dbWriteWorker() {
	defer ms.wg.Done()
	
	for dbOperation := range ms.dbWriteQueue {
		func() {
			defer func() {
				if r := recover(); r != nil {
					utils.Error("Database write worker panic recovered: %v", r)
				}
			}()
			dbOperation()
		}()
	}
}

// ProcessMove processes a move with full concurrency control
func (ms *MovementService) ProcessMove(sessionToken, direction string, count int, hasExplicitCount bool) (map[string]interface{}, error) {
	var gameSession models.GameSession

	// Get session from database (works for both anonymous and registered users)
	if err := ms.db.Where("session_token = ? AND is_active = ?", sessionToken, true).First(&gameSession).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return map[string]interface{}{
				"success": false,
				"error":   "Invalid or expired game session",
			}, nil
		}
		return nil, err
	}

	// Check if it's an anonymous user (PlayerID = nil)
	isAnonymous := gameSession.PlayerID == nil

	// Check if game is completed
	if gameSession.IsCompleted {
		return map[string]interface{}{
			"success": false,
			"error":   "Game already completed",
		}, nil
	}

	// Check game time limit
	sessionService := NewSessionService(ms.db, ms.cfg)
	if sessionService.IsGameExpired(&gameSession) {
		sessionService.ExpireGame(&gameSession)
		
		// Get map information for timeout response
		var gameMapData map[string]interface{}
		if currentMap := constant.GetMapByID(gameSession.MapID); currentMap != nil {
			gameMapData = map[string]interface{}{
				"id":          currentMap.ID,
				"name":        currentMap.Name,
				"description": currentMap.Description,
				"difficulty":  currentMap.Difficulty,
				"category":    currentMap.Category,
			}
		}
		
		return map[string]interface{}{
			"success":         false,
			"error":           "Game expired due to time limit",
			"game_failed":     true,
			"reason":          "timeout",
			"game_map":        gameSession.GetGameMap(),
			"player_pos": map[string]int{
				"row": gameSession.CurrentRow,
				"col": gameSession.CurrentCol,
			},
			"score":           gameSession.CurrentScore,
			"final_score":     gameSession.CurrentScore,
			"total_moves":     gameSession.TotalMoves,
			"completion_time": gameSession.CompletionTime,
			"current_map":     gameMapData,
		}, nil
	}

	// Validate and convert direction
	finalDirection, err := ms.validateDirection(direction)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}, nil
	}

	// Process movements count times or until blocked
	var totalPearlsCollected int
	movesExecuted := 0
	var finalMovementResult *game.MovementResult

	if count == 1 {
		// Single move - process normally
		var movementResult *game.MovementResult
		var err error
		
		// Use count-aware function for G commands even with count=1
		if finalDirection == "file_end" || finalDirection == "file_start" {
			movementResult, err = ms.calculateNewPositionWithCount(&gameSession, finalDirection, count, hasExplicitCount)
		} else {
			movementResult, err = ms.calculateNewPosition(&gameSession, finalDirection)
		}
		
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			}, nil
		}

		if !movementResult.IsValid {
			return map[string]interface{}{
				"success":  false,
				"error":    "Movement blocked",
				"game_map": gameSession.GetGameMap(),
				"player_pos": map[string]int{
					"row": gameSession.CurrentRow,
					"col": gameSession.CurrentCol,
				},
				"score":           gameSession.CurrentScore,
				"moves_executed":  0,
				"moves_requested": count,
			}, nil
		}

		gameMap := gameSession.GetGameMap()
		pearlCollected := gameMap[movementResult.NewRow][movementResult.NewCol] == game.PEARL
		if pearlCollected {
			totalPearlsCollected++
		}

		// Check for pearl mold collision (game failure) - only on hard difficulty maps
		if gameMap[movementResult.NewRow][movementResult.NewCol] == game.PEARL_MOLD {
			// Fail the game immediately
			gameSession.FailGame()
			err := ms.db.Save(&gameSession).Error
			if err != nil {
				return map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}, nil
			}
			
			// Get current map information
			gameMapData := constant.GetMapByID(gameSession.MapID)
			
			return map[string]interface{}{
				"success":      false,
				"error":        "Game failed - player hit pearl mold",
				"game_failed":  true,
				"reason":       "pearl_mold_collision",
				"game_map":     gameSession.GetGameMap(),
				"player_pos": map[string]int{
					"row": gameSession.CurrentRow,
					"col": gameSession.CurrentCol,
				},
				"score":           gameSession.CurrentScore,
				"final_score":     gameSession.CurrentScore,
				"total_moves":     gameSession.TotalMoves,
				"completion_time": gameSession.CompletionTime,
				"current_map":     gameMapData,
			}, nil
		}

		// Check if it's an arrow key for penalty
		arrowKeyPenalty := 0
		if direction == "ArrowLeft" || direction == "ArrowDown" || direction == "ArrowUp" || direction == "ArrowRight" {
			arrowKeyPenalty = 50
		}

		err = ms.db.Transaction(func(tx *gorm.DB) error {
			return ms.processMovementTransactionWithoutRateLimit(tx, sessionToken, direction, movementResult, pearlCollected, isAnonymous, &gameSession, false, arrowKeyPenalty)
		})

		if err != nil {
			return map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			}, nil
		}

		movesExecuted = 1
	} else {
		// Multiplier move - for G commands, use absolute positioning; for others, iterate
		if finalDirection == "file_end" || finalDirection == "file_start" {
			// For G commands, use absolute positioning directly
			movementResult, err := ms.calculateNewPositionWithCount(&gameSession, finalDirection, count, hasExplicitCount)
			if err != nil {
				return map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}, nil
			}

			if movementResult.IsValid {
				// Update session position for G commands
				gameSession.CurrentRow = movementResult.NewRow
				gameSession.CurrentCol = movementResult.NewCol
				gameSession.PreferredColumn = movementResult.PreferredColumn
				
				finalMovementResult = movementResult
				movesExecuted = 1 // Count as single move since it's absolute positioning
			}
		} else {
			// For other movements, iterate count times
			for i := 0; i < count; i++ {
				movementResult, err := ms.calculateNewPosition(&gameSession, finalDirection)
				if err != nil {
					return map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}, nil
				}

				// If movement is blocked, stop here
				if !movementResult.IsValid {
					break
				}

				// Temporarily update session for next calculation (but don't persist)
				gameSession.CurrentRow = movementResult.NewRow
				gameSession.CurrentCol = movementResult.NewCol
				gameSession.PreferredColumn = movementResult.PreferredColumn

				finalMovementResult = movementResult
				movesExecuted++
			}
		}

		// Process final move result if any moves were executed
		if movesExecuted > 0 {
			// Check for pearl only at final position
			gameMap := gameSession.GetGameMap()
			pearlCollected := gameMap[finalMovementResult.NewRow][finalMovementResult.NewCol] == game.PEARL
			if pearlCollected {
				totalPearlsCollected++
			}

			// Check for pearl mold collision (game failure) - only on hard difficulty maps
			moldCollision := false
			if gameMap[finalMovementResult.NewRow][finalMovementResult.NewCol] == game.PEARL_MOLD {
				// Check if there was a recent mold movement for this session
				// If so, give extra time for the frontend to update before confirming collision
				if ms.pearlMoldService != nil && ms.pearlMoldService.HasRecentMoldMovement(gameSession.SessionToken) {
					// Recent mold movement detected, add extra delay for visual sync
					time.Sleep(300 * time.Millisecond)
				} else {
					// Normal delay to ensure frontend shows the mold position
					time.Sleep(100 * time.Millisecond)
				}
				
				// Double-check the position after delay to ensure it's still a mold collision
				// (in case the mold moved again during the delay)
				currentGameMap := gameSession.GetGameMap()
				if currentGameMap[finalMovementResult.NewRow][finalMovementResult.NewCol] == game.PEARL_MOLD {
					moldCollision = true
				}
			}
			
			if moldCollision {
				// Fail the game immediately
				gameSession.FailGame()
				err := ms.db.Save(&gameSession).Error
				if err != nil {
					return map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}, nil
				}
				
				// Get current map information
				gameMapData := constant.GetMapByID(gameSession.MapID)
				
				return map[string]interface{}{
					"success":      false,
					"error":        "Game failed - player hit pearl mold",
					"game_failed":  true,
					"reason":       "pearl_mold_collision",
					"game_map":     gameSession.GetGameMap(),
					"player_pos": map[string]int{
						"row": gameSession.CurrentRow,
						"col": gameSession.CurrentCol,
					},
					"score":           gameSession.CurrentScore,
					"final_score":     gameSession.CurrentScore,
					"total_moves":     gameSession.TotalMoves,
					"completion_time": gameSession.CompletionTime,
					"current_map":     gameMapData,
				}, nil
			}

			// Check if it's an arrow key for penalty
			arrowKeyPenalty := 0
			if direction == "ArrowLeft" || direction == "ArrowDown" || direction == "ArrowUp" || direction == "ArrowRight" {
				arrowKeyPenalty = 50 * movesExecuted // Apply penalty for each move executed
			}

			// Process the final move with database transaction
			err := ms.db.Transaction(func(tx *gorm.DB) error {
				return ms.processMovementTransactionWithoutRateLimit(tx, sessionToken, direction, finalMovementResult, pearlCollected, isAnonymous, &gameSession, true, arrowKeyPenalty)
			})

			if err != nil {
				return map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}, nil
			}
		}
	}

	// If no moves were executed at all, return failure
	if movesExecuted == 0 {
		return map[string]interface{}{
			"success":  false,
			"error":    "Movement blocked",
			"game_map": gameSession.GetGameMap(),
			"player_pos": map[string]int{
				"row": gameSession.CurrentRow,
				"col": gameSession.CurrentCol,
			},
			"score":           gameSession.CurrentScore,
			"moves_executed":  0,
			"moves_requested": count,
		}, nil
	}

	// Get map information
	var currentMap *constant.Map
	for _, gameMap := range constant.GAME_MAPS {
		if gameMap.ID == gameSession.MapID {
			currentMap = &gameMap
			break
		}
	}

	result := map[string]interface{}{
		"success":  true,
		"game_map": gameSession.GetGameMap(),
		"player_pos": map[string]int{
			"row": gameSession.CurrentRow,
			"col": gameSession.CurrentCol,
		},
		"preferred_column":       gameSession.PreferredColumn,
		"score":                  gameSession.CurrentScore,
		"pearl_collected":        totalPearlsCollected > 0,
		"pearls_collected_count": totalPearlsCollected,
		"moves_executed":         movesExecuted,
		"moves_requested":        count,
		"total_moves":            gameSession.TotalMoves,
		"is_completed":           gameSession.IsCompleted,
		"completion_time":        gameSession.CompletionTime,
		"final_score":            gameSession.FinalScore,
		"selected_character":     gameSession.SelectedCharacter,
		"map_id":                 gameSession.MapID,
	}

	// Add map information if found
	if currentMap != nil {
		result["current_map"] = map[string]interface{}{
			"id":          currentMap.ID,
			"name":        currentMap.Name,
			"description": currentMap.Description,
			"difficulty":  currentMap.Difficulty,
			"category":    currentMap.Category,
		}
	}

	return result, nil
}

// validateDirection validates and converts direction input
func (ms *MovementService) validateDirection(direction string) (string, error) {
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
	directionName, exists := game.MovementKeys[baseDirection]
	if !exists {
		return "", errors.New("invalid movement key")
	}
	return directionName["direction"].(string), nil
}

// calculateNewPosition calculates the new position based on movement
func (ms *MovementService) calculateNewPosition(gameSession *models.GameSession, direction string) (*game.MovementResult, error) {
	gameMap := gameSession.GetGameMap()
	textGrid := gameSession.GetTextGrid()

	return game.CalculateNewPosition(
		direction,
		gameSession.CurrentRow,
		gameSession.CurrentCol,
		gameMap,
		textGrid,
		gameSession.PreferredColumn,
	)
}

// calculateNewPositionWithCount calculates the new position based on movement with count support
func (ms *MovementService) calculateNewPositionWithCount(gameSession *models.GameSession, direction string, count int, hasExplicitCount bool) (*game.MovementResult, error) {
	gameMap := gameSession.GetGameMap()
	textGrid := gameSession.GetTextGrid()

	return game.CalculateNewPositionWithCount(
		direction,
		gameSession.CurrentRow,
		gameSession.CurrentCol,
		gameMap,
		textGrid,
		gameSession.PreferredColumn,
		count,
		hasExplicitCount,
	)
}

// processMovementTransactionWithoutRateLimit handles the database transaction for move processing with optional rate limiting bypass
func (ms *MovementService) processMovementTransactionWithoutRateLimit(tx *gorm.DB, sessionToken string, direction string, movementResult *game.MovementResult, pearlCollected bool, isAnonymous bool, gameSession *models.GameSession, bypassRateLimit bool, arrowKeyPenalty int) error {
	// Reload session in transaction to ensure fresh state
	var txGameSession models.GameSession
	if err := tx.Where("session_token = ?", sessionToken).First(&txGameSession).Error; err != nil {
		return err
	}

	// Calculate motion-based score for pearl collection
	vimScores := constant.GetVimMotionScores()
	pearlScore := vimScores.GetMotionScore(direction)

	// Process move with concurrency control, optionally bypassing rate limiting
	err := txGameSession.ProcessMoveWithRateLimit(
		movementResult.NewRow,
		movementResult.NewCol,
		movementResult.PreferredColumn,
		pearlCollected,
		pearlScore,
		bypassRateLimit,
		arrowKeyPenalty,
	)
	if err != nil {
		return err
	}

	// Update game map
	updatedMap := txGameSession.GetGameMap()
	if pearlCollected {
		game.PlaceNewPearl(updatedMap, movementResult.NewRow, movementResult.NewCol)
		
		// For hard and medium difficulty maps, reposition enemies when pearl is collected
		gameMapData := constant.GetMapByID(txGameSession.MapID)
		if gameMapData != nil {
			if gameMapData.Difficulty == "hard" {
				game.RepositionEnemies(updatedMap, movementResult.NewRow, movementResult.NewCol, 5)
			} else if gameMapData.Difficulty == "medium" {
				game.RepositionEnemies(updatedMap, movementResult.NewRow, movementResult.NewCol, 3)
			}
		}
		
		txGameSession.SetGameMap(updatedMap)
	}

	// Check if game should be completed using difficulty-based target score
	targetScore := ms.getTargetScoreForMap(txGameSession.MapID)
	if txGameSession.CurrentScore >= targetScore {
		txGameSession.CompleteGame()
		// Update player stats only for registered users
		if !isAnonymous {
			ms.updatePlayerStats(tx, *txGameSession.PlayerID, &txGameSession)
			// Record map completion for progression tracking
			ms.recordMapCompletion(tx, *txGameSession.PlayerID, txGameSession.MapID)
		}
	}

	// Validate score integrity
	if !txGameSession.ValidateScoreIntegrity(ms.cfg.PearlPoints) {
		return errors.New("score integrity validation failed")
	}

	// Save the session and update our local copy
	*gameSession = txGameSession
	return tx.Save(&txGameSession).Error
}

// updatePlayerStats updates player statistics after game completion
func (ms *MovementService) updatePlayerStats(tx *gorm.DB, playerID uint, gameSession *models.GameSession) {
	var player models.Player
	tx.First(&player, playerID)

	player.TotalGames++
	if gameSession.IsCompleted {
		player.CompletedGames++
		if gameSession.FinalScore != nil && *gameSession.FinalScore > player.BestScore {
			player.BestScore = *gameSession.FinalScore
		}
		if gameSession.CompletionTime != nil && (player.FastestTime == nil || *gameSession.CompletionTime < *player.FastestTime) {
			player.FastestTime = gameSession.CompletionTime
		}

		// Update or create PlayerBestScore record
		bestScoreService := NewPlayerBestScoreService(tx)
		err := bestScoreService.UpsertPlayerBestScore(playerID, gameSession.MapID, gameSession)
		if err != nil {
			// Log error but don't fail the transaction
			// In a production environment, you might want to handle this differently
		}
	}
	player.TotalPearls += gameSession.PearlsCollected
	player.TotalMoves += gameSession.TotalMoves

	tx.Save(&player)
}

// recordMapCompletion records that a player has completed a map for progression tracking
func (ms *MovementService) recordMapCompletion(tx *gorm.DB, playerID uint, mapID int) error {
	// Check if this completion already exists
	var existingCompletion models.MapCompletion
	err := tx.Where("player_id = ? AND map_id = ?", playerID, mapID).First(&existingCompletion).Error
	
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	
	// If not found, create new completion record
	if err == gorm.ErrRecordNotFound {
		completion := models.MapCompletion{
			PlayerID: playerID,
			MapID:    mapID,
		}
		return tx.Create(&completion).Error
	}
	
	// If already exists, no need to create another one
	return nil
}

// getTargetScoreForMap returns the target score required to complete a map based on its difficulty
func (ms *MovementService) getTargetScoreForMap(mapID int) int {
	// Get map information
	gameMap := constant.GetMapByID(mapID)
	if gameMap == nil {
		// Fallback to default target score if map not found
		return ms.cfg.TargetScore
	}
	
	// Return target score based on difficulty
	switch gameMap.Difficulty {
	case "tutorial":
		return 500 // Tutorial maps require 5 pearls (5 * 100 points per pearl)
	case "easy":
		return 1000 // Easy maps require 10 pearls (10 * 100 points per pearl)
	case "medium":
		return 1500 // Medium maps require 15 pearls (15 * 100 points per pearl)
	case "hard":
		return 2000 // Hard maps require 20 pearls (20 * 100 points per pearl)
	default:
		// Fallback to default target score for unknown difficulties
		return ms.cfg.TargetScore
	}
}
