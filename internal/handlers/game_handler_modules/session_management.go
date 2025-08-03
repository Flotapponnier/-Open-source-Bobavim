package game_handler_modules

import (
	"net/http"
	"strings"
	"time"

	"boba-vim/internal/constant"
	"boba-vim/internal/models"
	gameService "boba-vim/internal/services/game"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetUsername sets the username for the current session
func SetUsername(c *gin.Context) {
	var request SetUsernameRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid username format",
		})
		return
	}

	// Get session
	session := sessions.Default(c)
	session.Set("username", request.Username)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save session",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"username": request.Username,
	})
}

// GetGameState returns the current game state
func GetGameState(gameService *gameService.GameService, c *gin.Context) {
	session := sessions.Default(c)
	sessionToken := session.Get("game_session_token")
	if sessionToken == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "No active game session",
		})
		return
	}

	result, err := gameService.GetGameState(sessionToken.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// StartGameWithMap starts a new game with a specific map
func StartGameWithMap(gameService *gameService.GameService, c *gin.Context) {
	var request StartGameRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		// Provide more specific error messages
		errorMsg := "Invalid request format"
		if err.Error() != "" {
			// Check if it's a validation error for map_id
			if strings.Contains(err.Error(), "map_id") {
				errorMsg = "Map ID must be between 1 and 19"
			}
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	// Validate map exists
	gameMap := constant.GetMapByID(request.MapID)
	if gameMap == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid map ID",
		})
		return
	}

	// Set default character if not provided
	selectedCharacter := request.SelectedCharacter
	if selectedCharacter == "" {
		selectedCharacter = "boba"
	}

	// Get session
	session := sessions.Default(c)
	username := session.Get("username")

	// Start game with specific map
	result, err := gameService.StartGameWithMap(username, selectedCharacter, request.MapID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Store session token
	session.Set("game_session_token", result["session_token"])
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save session",
		})
		return
	}

	// Add small delay to ensure session is fully committed
	time.Sleep(10 * time.Millisecond)

	c.JSON(http.StatusOK, result)
}

// QuitGame handles when a user quits the game
func QuitGame(db *gorm.DB, c *gin.Context) {
	session := sessions.Default(c)
	sessionToken := session.Get("game_session_token")
	
	if sessionToken == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "No active game session to quit",
		})
		return
	}
	
	// Find and deactivate the game session
	var gameSession models.GameSession
	if err := db.Where("session_token = ? AND is_active = ?", sessionToken.(string), true).First(&gameSession).Error; err == nil {
		now := time.Now()
		gameSession.IsActive = false
		gameSession.EndTime = &now
		db.Save(&gameSession)
	}
	
	// Clear session token
	session.Delete("game_session_token")
	session.Save()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Game session ended successfully",
	})
}

// PauseGame handles when a user pauses the game
func PauseGame(db *gorm.DB, c *gin.Context) {
	var request PauseGameRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pause request format",
		})
		return
	}

	session := sessions.Default(c)
	sessionToken := session.Get("game_session_token")
	
	if sessionToken == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No active game session to pause",
		})
		return
	}
	
	// Find and update the game session with pause information
	var gameSession models.GameSession
	if err := db.Where("session_token = ? AND is_active = ?", sessionToken.(string), true).First(&gameSession).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Active game session not found",
		})
		return
	}
	
	// Store pause time in session metadata or a dedicated field
	session.Set("game_paused_at", request.PauseTime)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save pause state",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Game paused successfully",
		"paused_at": request.PauseTime,
	})
}

// ResumeGame handles when a user resumes the game from pause
func ResumeGame(db *gorm.DB, c *gin.Context) {
	var request ResumeGameRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid resume request format",
		})
		return
	}

	session := sessions.Default(c)
	sessionToken := session.Get("game_session_token")
	
	if sessionToken == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No game session to resume",
		})
		return
	}
	
	// Find the game session
	var gameSession models.GameSession
	if err := db.Where("session_token = ? AND is_active = ?", sessionToken.(string), true).First(&gameSession).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Active game session not found",
		})
		return
	}
	
	// Get pause time and calculate duration
	pausedAt := session.Get("game_paused_at")
	if pausedAt != nil {
		// Update total paused time in the game session
		// This could be stored in a JSON field or separate table if needed
		session.Set("total_paused_time", request.TotalPausedTime)
	}
	
	// Clear pause state
	session.Delete("game_paused_at")
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to clear pause state",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Game resumed successfully",
		"resumed_at": request.ResumeTime,
		"pause_duration": request.PauseDuration,
		"total_paused_time": request.TotalPausedTime,
	})
}

// RestartGame handles when a user wants to restart the current map
func RestartGame(gameService *gameService.GameService, c *gin.Context) {
	var request RestartGameRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid restart request format",
		})
		return
	}

	session := sessions.Default(c)
	
	// End current game session if it exists
	sessionToken := session.Get("game_session_token")
	if sessionToken != nil {
		// Clear current session
		session.Delete("game_session_token")
		session.Delete("game_paused_at")
		session.Delete("total_paused_time")
	}
	
	// Start a new game with the same map
	mapIDStr := request.MapID
	if mapIDStr == "" {
		// Default to map 1 if no map specified
		mapIDStr = "1"
	}
	
	// Convert mapID to int
	mapID := 1 // default
	if mapIDStr == "2" { mapID = 2 }
	if mapIDStr == "3" { mapID = 3 }
	if mapIDStr == "4" { mapID = 4 }
	if mapIDStr == "5" { mapID = 5 }
	if mapIDStr == "6" { mapID = 6 }
	if mapIDStr == "7" { mapID = 7 }
	if mapIDStr == "8" { mapID = 8 }
	if mapIDStr == "9" { mapID = 9 }
	if mapIDStr == "10" { mapID = 10 }
	if mapIDStr == "11" { mapID = 11 }
	if mapIDStr == "12" { mapID = 12 }
	if mapIDStr == "13" { mapID = 13 }
	if mapIDStr == "14" { mapID = 14 }
	if mapIDStr == "15" { mapID = 15 }
	if mapIDStr == "16" { mapID = 16 }
	if mapIDStr == "17" { mapID = 17 }
	if mapIDStr == "18" { mapID = 18 }
	if mapIDStr == "19" { mapID = 19 }
	
	// Get username and character from session
	username := session.Get("username")
	selectedCharacter := "boba" // default character
	
	// Use the existing StartGameWithMap logic
	result, err := gameService.StartGameWithMap(username, selectedCharacter, mapID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	
	// Store session token
	session.Set("game_session_token", result["session_token"])
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save session",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Game restarted successfully",
		"map_id": mapIDStr,
		"game_state": result,
	})
}