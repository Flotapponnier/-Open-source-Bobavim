package matchmaking_modules

import (
	"sync"
	"time"
)

// ActiveMatchesManager handles active match storage and retrieval
type ActiveMatchesManager struct {
	activeMatches map[string]*ActiveMatch
	matchMutex    sync.RWMutex
}

// NewActiveMatchesManager creates a new active matches manager
func NewActiveMatchesManager() *ActiveMatchesManager {
	return &ActiveMatchesManager{
		activeMatches: make(map[string]*ActiveMatch),
	}
}

// AddMatch adds a match to active matches
func (amm *ActiveMatchesManager) AddMatch(matchID string, match *ActiveMatch) {
	amm.matchMutex.Lock()
	defer amm.matchMutex.Unlock()
	
	amm.activeMatches[matchID] = match
}

// GetMatch retrieves a match by ID
func (amm *ActiveMatchesManager) GetMatch(matchID string) (*ActiveMatch, bool) {
	amm.matchMutex.RLock()
	defer amm.matchMutex.RUnlock()
	
	match, exists := amm.activeMatches[matchID]
	return match, exists
}

// RemoveMatch removes a match from active matches
func (amm *ActiveMatchesManager) RemoveMatch(matchID string) {
	amm.matchMutex.Lock()
	defer amm.matchMutex.Unlock()
	
	delete(amm.activeMatches, matchID)
}

// GetExpiredMatches returns all matches that have expired
func (amm *ActiveMatchesManager) GetExpiredMatches(now time.Time) []*ActiveMatch {
	amm.matchMutex.RLock()
	defer amm.matchMutex.RUnlock()
	
	var expired []*ActiveMatch
	for _, match := range amm.activeMatches {
		if now.After(match.ExpiresAt) {
			expired = append(expired, match)
		}
	}
	
	return expired
}

// Cleanup clears all active matches
func (amm *ActiveMatchesManager) Cleanup() {
	amm.matchMutex.Lock()
	defer amm.matchMutex.Unlock()
	
	amm.activeMatches = make(map[string]*ActiveMatch)
}