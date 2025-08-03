package matchmaking

import (
	"net/http"
	"sync"

	"boba-vim/internal/cache"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MatchmakingService is the main service for handling matchmaking operations
type MatchmakingService struct {
	db               *gorm.DB
	manager          *MatchmakingManager
	wsManager        *WebSocketManager
	multiplayerGame  MultiplayerGameService
	mu               sync.RWMutex
	cache            *cache.RedisCache
}

// MultiplayerGameService interface for game operations
type MultiplayerGameService interface {
	StartMultiplayerGame(matchID string, player1ID uint, player1Username, player1Character string, player2ID uint, player2Username, player2Character string) (interface{}, error)
	HandlePlayerDisconnect(playerID uint)
}

// NewMatchmakingService creates a new matchmaking service
func NewMatchmakingService(db *gorm.DB, multiplayerGame MultiplayerGameService) *MatchmakingService {
	wsManager := NewWebSocketManager()
	
	ms := &MatchmakingService{
		db:              db,
		wsManager:       wsManager,
		multiplayerGame: multiplayerGame,
		cache:           cache.GlobalCache,
	}
	
	// Create manager with game starter
	manager := NewMatchmakingManager(db, wsManager, ms)
	ms.manager = manager
	
	return ms
}

// StartMultiplayerGame implements the MultiplayerGameStarter interface
func (ms *MatchmakingService) StartMultiplayerGame(matchID string, player1ID uint, player1Username, player1Character string, player2ID uint, player2Username, player2Character string) error {
	if ms.multiplayerGame != nil {
		_, err := ms.multiplayerGame.StartMultiplayerGame(matchID, player1ID, player1Username, player1Character, player2ID, player2Username, player2Character)
		return err
	}
	utils.Error("No multiplayer game service available")
	return nil
}

// DB returns the database instance
func (ms *MatchmakingService) DB() *gorm.DB {
	return ms.db
}

// HandleWebSocketConnection handles new WebSocket connections
func (ms *MatchmakingService) HandleWebSocketConnection(c *gin.Context) {
	// Get player info from session
	playerID, username, err := ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	// Set player info in context
	c.Set("playerID", playerID)
	c.Set("username", username)
	
	// Upgrade connection to WebSocket
	ms.wsManager.HandleConnection(c.Writer, c.Request, playerID)
}

// JoinQueue handles joining the matchmaking queue
func (ms *MatchmakingService) JoinQueue(c *gin.Context) {
	// Get player info from session
	playerID, username, err := ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	var request QueueJoinRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	// Validate selected character
	if request.SelectedCharacter == "" {
		request.SelectedCharacter = "boba" // Default character
	}
	
	// Join queue
	err = ms.manager.JoinQueue(playerID, username, request.SelectedCharacter)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Joined matchmaking queue",
		"queue_size": ms.manager.GetQueueSize(),
	})
}

// LeaveQueue handles leaving the matchmaking queue
func (ms *MatchmakingService) LeaveQueue(c *gin.Context) {
	playerID, _, err := ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	err = ms.manager.LeaveQueue(playerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Left matchmaking queue",
	})
}

// AcceptMatch handles accepting a match
func (ms *MatchmakingService) AcceptMatch(c *gin.Context) {
	playerID, _, err := ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	var request MatchAcceptanceData
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	if request.Accepted {
		err = ms.manager.AcceptMatch(request.MatchID, playerID)
	} else {
		err = ms.manager.RejectMatch(request.MatchID, playerID)
	}
	
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Match response recorded",
	})
}

// GetPlayerStatus returns the current status of a player
func (ms *MatchmakingService) GetPlayerStatus(c *gin.Context) {
	playerID, _, err := ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	status := ms.manager.GetPlayerStatus(playerID)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status": status,
		"queue_size": ms.manager.GetQueueSize(),
	})
}

// GetQueueStatus returns general queue information
func (ms *MatchmakingService) GetQueueStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"queue_size": ms.manager.GetQueueSize(),
		"connected_players": len(ms.wsManager.GetConnectedPlayers()),
	})
}

// Cleanup shuts down the matchmaking service
func (ms *MatchmakingService) Cleanup() {
	utils.Info("Shutting down matchmaking service...")
	
	ms.manager.Cleanup()
	ms.wsManager.Cleanup()
	
	utils.Info("Matchmaking service shut down complete")
}

// Helper functions for session management

// GetPlayerFromSession extracts player information from session
func GetPlayerFromSession(c *gin.Context, db *gorm.DB) (*models.Player, error) {
	playerID, exists := c.Get("playerID")
	if !exists {
		return nil, ErrPlayerNotConnected
	}
	
	playerIDUint, ok := playerID.(uint)
	if !ok {
		return nil, ErrPlayerNotConnected
	}
	
	var player models.Player
	if err := db.Where("id = ?", playerIDUint).First(&player).Error; err != nil {
		return nil, err
	}
	
	return &player, nil
}

// ValidatePlayerSession validates that a player has a valid session
func ValidatePlayerSession(c *gin.Context) (uint, string, error) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	
	// Check if user is logged in and registered (but allow both confirmed and non-confirmed emails)
	if userID == nil || username == nil || isRegistered == nil || !isRegistered.(bool) {
		return 0, "", ErrPlayerNotConnected
	}
	
	playerID, ok := userID.(uint)
	if !ok {
		return 0, "", ErrPlayerNotConnected
	}
	
	playerUsername := username.(string)
	
	return playerID, playerUsername, nil
}