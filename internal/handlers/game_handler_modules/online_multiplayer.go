package game_handler_modules

import (
	"net/http"

	"boba-vim/internal/services/matchmaking"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// PlayOnline handles joining the matchmaking queue via WebSocket
func PlayOnline(matchmakingService *matchmaking.MatchmakingService, c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	
	// Check if user is registered (allow both confirmed and non-confirmed emails)
	if userID == nil || username == nil || isRegistered == nil || !isRegistered.(bool) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Please register to play online",
			"requires_registration": true,
		})
		return
	}
	
	playerID, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Invalid session",
		})
		return
	}
	
	playerUsername := username.(string)
	
	// Redirect to WebSocket endpoint - frontend should connect to WebSocket
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connect to WebSocket for matchmaking",
		"websocket_url": "/api/matchmaking/ws",
		"player_id": playerID,
		"username": playerUsername,
	})
}

// CheckMatchmaking gets the current status of a player's matchmaking
func CheckMatchmaking(matchmakingService *matchmaking.MatchmakingService, c *gin.Context) {
	// Use the matchmaking service to get status
	matchmakingService.GetPlayerStatus(c)
}

// CancelMatchmaking removes a player from the matchmaking queue
func CancelMatchmaking(matchmakingService *matchmaking.MatchmakingService, c *gin.Context) {
	// Use the matchmaking service to leave queue
	matchmakingService.LeaveQueue(c)
}