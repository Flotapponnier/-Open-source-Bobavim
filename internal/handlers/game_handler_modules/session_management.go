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