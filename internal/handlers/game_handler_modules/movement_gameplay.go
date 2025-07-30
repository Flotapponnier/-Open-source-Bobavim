package game_handler_modules

import (
	"net/http"

	gameService "boba-vim/internal/services/game"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// MovePlayer handles player movement with strict concurrency control
func MovePlayer(gameService *gameService.GameService, c *gin.Context) {
	var request MovePlayerRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Get session token
	session := sessions.Default(c)
	sessionToken := session.Get("game_session_token")

	if sessionToken == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "No active game session",
		})
		return
	}

	// Set default count to 1 if not provided, and enforce maximum limit
	count := request.Count
	if count <= 0 {
		count = 1
	}
	// Prevent abuse with extremely large numbers
	if count > 1000 {
		count = 1000
	}

	// Process move
	result, err := gameService.ProcessMove(sessionToken.(string), request.Direction, count, request.HasExplicitCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

