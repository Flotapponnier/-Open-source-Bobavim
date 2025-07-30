package matchmaking_modules

import (
	"sync"
)

// StatusManager handles player status tracking
type StatusManager struct {
	playerStatus map[uint]MatchmakingStatus
	statusMutex  sync.RWMutex
}

// NewStatusManager creates a new status manager
func NewStatusManager() *StatusManager {
	return &StatusManager{
		playerStatus: make(map[uint]MatchmakingStatus),
	}
}

// SetPlayerStatus sets the status of a player
func (sm *StatusManager) SetPlayerStatus(playerID uint, status MatchmakingStatus) {
	sm.statusMutex.Lock()
	defer sm.statusMutex.Unlock()
	
	sm.playerStatus[playerID] = status
}

// GetPlayerStatus returns the current status of a player
func (sm *StatusManager) GetPlayerStatus(playerID uint) MatchmakingStatus {
	sm.statusMutex.RLock()
	defer sm.statusMutex.RUnlock()
	
	if status, exists := sm.playerStatus[playerID]; exists {
		return status
	}
	return StatusIdle
}

// Cleanup clears all player statuses
func (sm *StatusManager) Cleanup() {
	sm.statusMutex.Lock()
	defer sm.statusMutex.Unlock()
	
	sm.playerStatus = make(map[uint]MatchmakingStatus)
}