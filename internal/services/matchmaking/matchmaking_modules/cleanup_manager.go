package matchmaking_modules

import (
	"context"
	"log"
	"time"

	"boba-vim/internal/models/model_modules"
	"gorm.io/gorm"
)

// CleanupManager handles background cleanup tasks
type CleanupManager struct {
	db            *gorm.DB
	ctx           context.Context
	cancel        context.CancelFunc
	cleanupTicker *time.Ticker
}

// NewCleanupManager creates a new cleanup manager
func NewCleanupManager(db *gorm.DB) *CleanupManager {
	ctx, cancel := context.WithCancel(context.Background())
	
	cm := &CleanupManager{
		db:            db,
		ctx:           ctx,
		cancel:        cancel,
		cleanupTicker: time.NewTicker(30 * time.Second),
	}
	
	return cm
}

// StartCleanupProcess starts the background cleanup process
func (cm *CleanupManager) StartCleanupProcess(activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) {
	go cm.cleanupExpiredMatches(activeMatches, wsManager, statusManager)
}

// cleanupExpiredMatches removes expired matches
func (cm *CleanupManager) cleanupExpiredMatches(activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) {
	for {
		select {
		case <-cm.ctx.Done():
			return
		case <-cm.cleanupTicker.C:
			cm.processExpiredMatches(activeMatches, wsManager, statusManager)
		}
	}
}

// processExpiredMatches processes and removes expired matches
func (cm *CleanupManager) processExpiredMatches(activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) {
	now := time.Now()
	expiredMatches := activeMatches.GetExpiredMatches(now)
	
	for _, match := range expiredMatches {
		// Remove the match
		activeMatches.RemoveMatch(match.ID)
		
		// Update player statuses
		statusManager.SetPlayerStatus(match.Player1ID, StatusIdle)
		statusManager.SetPlayerStatus(match.Player2ID, StatusIdle)
		
		// Remove from database
		cm.db.Where("(player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?)", 
			match.Player1ID, match.Player2ID, match.Player2ID, match.Player1ID).
			Delete(&model_modules.OnlineMatch{})
		
		// Send timeout messages
		wsManager.SendMessage(match.Player1ID, WebSocketMessage{
			Type:      MsgTypeMatchCancelled,
			Message:   "Match expired. No response from opponent.",
			Timestamp: time.Now(),
		})
		
		wsManager.SendMessage(match.Player2ID, WebSocketMessage{
			Type:      MsgTypeMatchCancelled,
			Message:   "Match expired. No response from opponent.",
			Timestamp: time.Now(),
		})
		
		log.Printf("Match %s expired", match.ID)
	}
}

// Cleanup shuts down the cleanup manager
func (cm *CleanupManager) Cleanup() {
	cm.cancel()
	cm.cleanupTicker.Stop()
	log.Println("Cleanup manager shut down")
}