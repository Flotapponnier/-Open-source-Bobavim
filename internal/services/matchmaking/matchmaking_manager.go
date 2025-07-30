package matchmaking

import (
	"context"
	"time"

	"boba-vim/internal/services/matchmaking/matchmaking_modules"
	"gorm.io/gorm"
)

// Type aliases to ensure compatibility
type mmWebSocketManager struct {
	wsManager *WebSocketManager
}

func (w *mmWebSocketManager) IsPlayerConnected(playerID uint) bool {
	return w.wsManager.IsPlayerConnected(playerID)
}

func (w *mmWebSocketManager) SendMessage(playerID uint, message interface{}) error {
	return w.wsManager.SendMessage(playerID, message)
}

// MatchmakingManager handles the core matchmaking logic
type MatchmakingManager struct {
	db             *gorm.DB
	wsManager      *WebSocketManager
	gameStarter    matchmaking_modules.MultiplayerGameStarter
	ctx            context.Context
	cancel         context.CancelFunc
	
	// Module components
	queueManager      *matchmaking_modules.QueueManager
	matchCreator      *matchmaking_modules.MatchCreator
	matchLifecycle    *matchmaking_modules.MatchLifecycleManager
	cleanupManager    *matchmaking_modules.CleanupManager
	statusManager     *matchmaking_modules.StatusManager
	activeMatches     *matchmaking_modules.ActiveMatchesManager
	
	// Wrapper for WebSocket manager
	wsWrapper         *mmWebSocketManager
}

// NewMatchmakingManager creates a new matchmaking manager
func NewMatchmakingManager(db *gorm.DB, wsManager *WebSocketManager, gameStarter matchmaking_modules.MultiplayerGameStarter) *MatchmakingManager {
	ctx, cancel := context.WithCancel(context.Background())
	
	wsWrapper := &mmWebSocketManager{wsManager: wsManager}
	
	mm := &MatchmakingManager{
		db:          db,
		wsManager:   wsManager,
		gameStarter: gameStarter,
		ctx:         ctx,
		cancel:      cancel,
		wsWrapper:   wsWrapper,
		
		// Initialize module components
		queueManager:   matchmaking_modules.NewQueueManager(db),
		matchCreator:   matchmaking_modules.NewMatchCreator(db),
		matchLifecycle: matchmaking_modules.NewMatchLifecycleManager(db, gameStarter),
		cleanupManager: matchmaking_modules.NewCleanupManager(db),
		statusManager:  matchmaking_modules.NewStatusManager(),
		activeMatches:  matchmaking_modules.NewActiveMatchesManager(),
	}
	
	// Start background processes
	go mm.processQueue()
	mm.cleanupManager.StartCleanupProcess(mm.activeMatches, mm.wsWrapper, mm.statusManager)
	
	return mm
}

// JoinQueue adds a player to the matchmaking queue
func (mm *MatchmakingManager) JoinQueue(playerID uint, username, selectedCharacter string) error {
	err := mm.queueManager.JoinQueue(playerID, username, selectedCharacter, mm.wsWrapper)
	if err != nil {
		return err
	}
	
	mm.statusManager.SetPlayerStatus(playerID, matchmaking_modules.MatchmakingStatus(StatusSearching))
	return nil
}

// LeaveQueue removes a player from the matchmaking queue
func (mm *MatchmakingManager) LeaveQueue(playerID uint) error {
	err := mm.queueManager.LeaveQueue(playerID, mm.wsWrapper)
	if err != nil {
		return err
	}
	
	mm.statusManager.SetPlayerStatus(playerID, matchmaking_modules.MatchmakingStatus(StatusIdle))
	return nil
}

// AcceptMatch handles a player accepting a match
func (mm *MatchmakingManager) AcceptMatch(matchID string, playerID uint) error {
	return mm.matchLifecycle.AcceptMatch(matchID, playerID, mm.activeMatches, mm.wsWrapper, mm.statusManager)
}

// RejectMatch handles a player rejecting a match
func (mm *MatchmakingManager) RejectMatch(matchID string, playerID uint) error {
	return mm.matchLifecycle.RejectMatch(matchID, playerID, mm.activeMatches, mm.wsWrapper, mm.statusManager)
}

// GetPlayerStatus returns the current status of a player
func (mm *MatchmakingManager) GetPlayerStatus(playerID uint) MatchmakingStatus {
	return MatchmakingStatus(mm.statusManager.GetPlayerStatus(playerID))
}

// GetQueueSize returns the current size of the matchmaking queue
func (mm *MatchmakingManager) GetQueueSize() int {
	return mm.queueManager.GetQueueSize()
}

// processQueue continuously processes the matchmaking queue
func (mm *MatchmakingManager) processQueue() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-mm.ctx.Done():
			return
		case <-ticker.C:
			mm.tryCreateMatches()
			mm.queueManager.CheckQueueTimeouts(mm.wsWrapper)
		}
	}
}

// tryCreateMatches attempts to create matches from queued players
func (mm *MatchmakingManager) tryCreateMatches() {
	players := mm.queueManager.GetQueuedPlayers(mm.wsWrapper)
	mm.matchCreator.TryCreateMatches(players, mm.activeMatches, mm.wsWrapper, mm.statusManager, mm.queueManager)
}

// Cleanup shuts down the matchmaking manager
func (mm *MatchmakingManager) Cleanup() {
	mm.cancel()
	mm.cleanupManager.Cleanup()
	mm.queueManager.Cleanup()
	mm.activeMatches.Cleanup()
	mm.statusManager.Cleanup()
}