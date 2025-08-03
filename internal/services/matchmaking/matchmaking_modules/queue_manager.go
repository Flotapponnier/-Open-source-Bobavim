package matchmaking_modules

import (
	"fmt"
	"sync"
	"time"

	"boba-vim/internal/models/model_modules"
	"boba-vim/internal/utils"
	"gorm.io/gorm"
)

// QueueManager handles queue operations
type QueueManager struct {
	db         *gorm.DB
	queue      map[uint]*QueuePlayer
	queueMutex sync.RWMutex
}

// NewQueueManager creates a new queue manager
func NewQueueManager(db *gorm.DB) *QueueManager {
	return &QueueManager{
		db:    db,
		queue: make(map[uint]*QueuePlayer),
	}
}

// JoinQueue adds a player to the matchmaking queue
func (qm *QueueManager) JoinQueue(playerID uint, username, selectedCharacter string, wsManager WebSocketManager) error {
	qm.queueMutex.Lock()
	defer qm.queueMutex.Unlock()
	
	// Check if player is already in queue
	if _, exists := qm.queue[playerID]; exists {
		return ErrPlayerAlreadyInQueue
	}
	
	// Check if player is connected via WebSocket
	if !wsManager.IsPlayerConnected(playerID) {
		return ErrPlayerNotConnected
	}
	
	// Check queue size limit
	if len(qm.queue) >= MaxQueueSize {
		return fmt.Errorf("queue is full (max %d players)", MaxQueueSize)
	}
	
	// Add player to queue
	queuePlayer := &QueuePlayer{
		PlayerID:          playerID,
		Username:          username,
		SelectedCharacter: selectedCharacter,
		QueuedAt:          time.Now(),
	}
	
	qm.queue[playerID] = queuePlayer
	
	// Add to database
	dbQueue := &model_modules.MatchmakingQueue{
		PlayerID:          playerID,
		Username:          username,
		SelectedCharacter: selectedCharacter,
	}
	
	if err := qm.db.Create(dbQueue).Error; err != nil {
		// Remove from memory queue if DB insert fails
		delete(qm.queue, playerID)
		return fmt.Errorf("failed to add to database queue: %v", err)
	}
	
	// Send confirmation message
	wsManager.SendMessage(playerID, WebSocketMessage{
		Type:      MsgTypeQueueJoined,
		Message:   "You have joined the matchmaking queue",
		Timestamp: time.Now(),
	})
	
	utils.Info("Player %d (%s) joined matchmaking queue", playerID, username)
	return nil
}

// LeaveQueue removes a player from the matchmaking queue
func (qm *QueueManager) LeaveQueue(playerID uint, wsManager WebSocketManager) error {
	qm.queueMutex.Lock()
	defer qm.queueMutex.Unlock()
	
	// Check if player is in queue
	if _, exists := qm.queue[playerID]; !exists {
		return ErrPlayerNotInQueue
	}
	
	// Remove from memory queue
	delete(qm.queue, playerID)
	
	// Remove from database
	qm.db.Where("player_id = ?", playerID).Delete(&model_modules.MatchmakingQueue{})
	
	// Send confirmation message
	wsManager.SendMessage(playerID, WebSocketMessage{
		Type:      MsgTypeQueueLeft,
		Message:   "You have left the matchmaking queue",
		Timestamp: time.Now(),
	})
	
	utils.Info("Player %d left matchmaking queue", playerID)
	return nil
}

// GetQueuedPlayers returns queued players for matching
func (qm *QueueManager) GetQueuedPlayers(wsManager WebSocketManager) []*QueuePlayer {
	qm.queueMutex.RLock()
	defer qm.queueMutex.RUnlock()
	
	players := make([]*QueuePlayer, 0, len(qm.queue))
	for _, player := range qm.queue {
		// Only include players who are still connected
		if wsManager.IsPlayerConnected(player.PlayerID) {
			players = append(players, player)
		}
	}
	
	return players
}

// RemovePlayersFromQueue removes multiple players from queue
func (qm *QueueManager) RemovePlayersFromQueue(playerIDs []uint) {
	qm.queueMutex.Lock()
	defer qm.queueMutex.Unlock()
	
	for _, playerID := range playerIDs {
		delete(qm.queue, playerID)
	}
	
	// Remove from database
	if len(playerIDs) > 0 {
		qm.db.Where("player_id IN ?", playerIDs).Delete(&model_modules.MatchmakingQueue{})
	}
}

// CheckQueueTimeouts removes players who have been in queue too long
func (qm *QueueManager) CheckQueueTimeouts(wsManager WebSocketManager) {
	qm.queueMutex.Lock()
	defer qm.queueMutex.Unlock()
	
	now := time.Now()
	for playerID, queuePlayer := range qm.queue {
		if now.Sub(queuePlayer.QueuedAt) > QueueTimeoutDuration {
			// Remove from queue
			delete(qm.queue, playerID)
			
			// Remove from database
			qm.db.Where("player_id = ?", playerID).Delete(&model_modules.MatchmakingQueue{})
			
			// Send timeout message
			wsManager.SendMessage(playerID, WebSocketMessage{
				Type:      MsgTypeQueueTimeout,
				Message:   "Matchmaking timeout. No opponent found.",
				Timestamp: time.Now(),
			})
			
			utils.Debug("Player %d timed out in queue", playerID)
		}
	}
}

// GetQueueSize returns the current size of the matchmaking queue
func (qm *QueueManager) GetQueueSize() int {
	qm.queueMutex.RLock()
	defer qm.queueMutex.RUnlock()
	
	return len(qm.queue)
}

// Cleanup clears the queue
func (qm *QueueManager) Cleanup() {
	qm.queueMutex.Lock()
	defer qm.queueMutex.Unlock()
	
	qm.queue = make(map[uint]*QueuePlayer)
}