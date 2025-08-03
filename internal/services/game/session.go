package game

import (
	"errors"
	"time"

	"boba-vim/internal/cache"
	"boba-vim/internal/config"
	"boba-vim/internal/constant"
	"boba-vim/internal/game"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"

	"gorm.io/gorm"
)

// SessionService handles game session creation and management
type SessionService struct {
	db    *gorm.DB
	cfg   *config.Config
	cache *cache.RedisCache
}

// NewSessionService creates a new session service
func NewSessionService(db *gorm.DB, cfg *config.Config) *SessionService {
	return &SessionService{
		db:    db,
		cfg:   cfg,
		cache: cache.GlobalCache,
	}
}

// GetGameState returns current game state
func (ss *SessionService) GetGameState(sessionToken string) (map[string]interface{}, error) {
	// Try to get from cache first
	cacheKey := cache.GetGameSessionKey(sessionToken)
	if ss.cache != nil && ss.cache.IsAvailable() {
		var cachedSession models.GameSession
		if err := ss.cache.Get(cacheKey, &cachedSession); err == nil {
			return ss.buildGameStateResponse(&cachedSession), nil
		}
	}

	var gameSession models.GameSession

	// Get session from database (works for both anonymous and registered users)
	if err := ss.db.Where("session_token = ? AND is_active = ?", sessionToken, true).First(&gameSession).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Check if there's a completed/inactive session with this token
			var completedSession models.GameSession
			if err := ss.db.Where("session_token = ?", sessionToken).First(&completedSession).Error; err == nil {
				// Found a completed session, return its final state
				return ss.buildGameStateResponse(&completedSession), nil
			}
			// No session found at all
			return map[string]interface{}{
				"success": false,
				"error":   "Invalid or expired game session",
			}, nil
		}
		return nil, err
	}

	// Cache the session for future requests
	if ss.cache != nil && ss.cache.IsAvailable() {
		if err := ss.cache.Set(cacheKey, gameSession, 5*time.Minute); err != nil {
			// Log error but don't fail the request
			utils.Error("Failed to cache game session: %v", err)
		}
	}

	return ss.buildGameStateResponse(&gameSession), nil
}

// buildGameStateResponse creates the response map from a game session
func (ss *SessionService) buildGameStateResponse(gameSession *models.GameSession) map[string]interface{} {

	// Get map information
	var currentMap *constant.Map
	for _, gameMap := range constant.GAME_MAPS {
		if gameMap.ID == gameSession.MapID {
			currentMap = &gameMap
			break
		}
	}

	result := map[string]interface{}{
		"success":   true,
		"text_grid": gameSession.GetTextGrid(),
		"game_map":  gameSession.GetGameMap(),
		"player_pos": map[string]int{
			"row": gameSession.CurrentRow,
			"col": gameSession.CurrentCol,
		},
		"score":              gameSession.CurrentScore,
		"selected_character": gameSession.SelectedCharacter,
		"is_completed":       gameSession.IsCompleted,
		"completion_time":    gameSession.CompletionTime,
		"final_score":        gameSession.FinalScore,
		"pearls_collected":   gameSession.PearlsCollected,
		"total_moves":        gameSession.TotalMoves,
		"map_id":             gameSession.MapID,
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

	return result
}

// IsGameExpired checks if a game session has expired
func (ss *SessionService) IsGameExpired(gameSession *models.GameSession) bool {
	if gameSession.StartTime == nil {
		return false
	}
	return time.Since(*gameSession.StartTime) > ss.cfg.MaxGameTime
}

// ExpireGame marks a game session as expired/failed
func (ss *SessionService) ExpireGame(gameSession *models.GameSession) {
	gameSession.FailGame()
	ss.db.Save(gameSession)
}

// StartGameWithMap starts a new game with a specific map
func (ss *SessionService) StartGameWithMap(username interface{}, selectedCharacter string, mapID int) (map[string]interface{}, error) {
	// Default to 'boba' if no character provided
	if selectedCharacter == "" {
		selectedCharacter = "boba"
	}

	// Initialize game data with specific map
	gameData := game.InitializeGameSessionWithMap(mapID)

	var gameSession *models.GameSession

	// Convert username to string if it's not nil
	var usernameStr string
	if username != nil {
		usernameStr = username.(string)
	} else {
		usernameStr = "Anonymous"
	}

	if usernameStr == "Anonymous" || usernameStr == "" {
		gameSession = ss.createAnonymousSessionWithMap(selectedCharacter, gameData, mapID)
	} else {
		var err error
		gameSession, err = ss.createRegisteredUserSessionWithMap(usernameStr, selectedCharacter, gameData, mapID)
		if err != nil {
			return nil, err
		}
	}

	if err := ss.db.Create(gameSession).Error; err != nil {
		return nil, err
	}

	// Clear cache for the new session token to prevent stale data
	if ss.cache != nil && ss.cache.IsAvailable() {
		cacheKey := cache.GetGameSessionKey(gameSession.SessionToken)
		ss.cache.Delete(cacheKey)
	}

	return map[string]interface{}{
		"success":       true,
		"session_token": gameSession.SessionToken,
		"map_id":        mapID,
		"game_data": map[string]interface{}{
			"text_grid":          gameData["text_grid"],
			"game_map":           gameSession.GetGameMap(),
			"player_pos":         map[string]int{"row": gameSession.CurrentRow, "col": gameSession.CurrentCol},
			"score":              gameSession.CurrentScore,
			"is_completed":       gameSession.IsCompleted,
			"selected_character": gameSession.SelectedCharacter,
			"map_id":             mapID,
		},
	}, nil
}

// createAnonymousSessionWithMap creates a game session for anonymous users with specific map
func (ss *SessionService) createAnonymousSessionWithMap(selectedCharacter string, gameData map[string]interface{}, mapID int) *models.GameSession {
	// For anonymous users, only clean up very old sessions (older than 1 hour) to prevent database bloat
	// We don't deactivate recent sessions since each browser should be independent
	oneHourAgo := time.Now().Add(-1 * time.Hour)
	ss.db.Model(&models.GameSession{}).
		Where("player_id IS NULL AND is_active = ? AND created_at < ?", true, oneHourAgo).
		Updates(map[string]interface{}{
			"is_active": false,
			"end_time":  time.Now(),
		})

	// Create new game session for anonymous user
	gameSession := &models.GameSession{
		PlayerID:          nil, // nil indicates anonymous user
		SelectedCharacter: selectedCharacter,
		MapID:             mapID,
		CurrentScore:      0,
		CurrentRow:        gameData["player_pos"].(map[string]int)["row"],
		CurrentCol:        gameData["player_pos"].(map[string]int)["col"],
		PreferredColumn:   gameData["preferred_column"].(int),
		TotalMoves:        0,
		PearlsCollected:   0,
		IsActive:          true,
		IsCompleted:       false,
	}

	// Set game map and text grid
	gameSession.SetGameMap(gameData["game_map"].([][]int))
	gameSession.SetTextGrid(gameData["text_grid"].([][]string))

	return gameSession
}

// createRegisteredUserSessionWithMap creates a game session for registered users with specific map
func (ss *SessionService) createRegisteredUserSessionWithMap(username, selectedCharacter string, gameData map[string]interface{}, mapID int) (*models.GameSession, error) {
	// Handle registered users
	var player models.Player
	result := ss.db.Where("username = ?", username).First(&player)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// This shouldn't happen for registered users
			return nil, errors.New("user not found - please register first")
		} else {
			return nil, result.Error
		}
	}

	// Deactivate existing active sessions for this player
	now := time.Now()
	ss.db.Model(&models.GameSession{}).
		Where("player_id = ? AND is_active = ?", player.ID, true).
		Updates(map[string]interface{}{
			"is_active": false,
			"end_time":  &now,
		})

	// Create new game session for registered user
	gameSession := &models.GameSession{
		PlayerID:          &player.ID,
		SelectedCharacter: selectedCharacter,
		MapID:             mapID,
		CurrentScore:      0,
		CurrentRow:        gameData["player_pos"].(map[string]int)["row"],
		CurrentCol:        gameData["player_pos"].(map[string]int)["col"],
		PreferredColumn:   gameData["preferred_column"].(int),
		TotalMoves:        0,
		PearlsCollected:   0,
		IsActive:          true,
		IsCompleted:       false,
	}

	// Set game map and text grid
	gameSession.SetGameMap(gameData["game_map"].([][]int))
	gameSession.SetTextGrid(gameData["text_grid"].([][]string))

	return gameSession, nil
}
