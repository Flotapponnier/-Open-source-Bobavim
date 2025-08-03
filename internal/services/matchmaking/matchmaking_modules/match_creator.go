package matchmaking_modules

import (
	"time"

	"boba-vim/internal/models/model_modules"
	"boba-vim/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MatchCreator handles match creation logic
type MatchCreator struct {
	db *gorm.DB
}

// NewMatchCreator creates a new match creator
func NewMatchCreator(db *gorm.DB) *MatchCreator {
	return &MatchCreator{
		db: db,
	}
}

// TryCreateMatches attempts to create matches from queued players
func (mc *MatchCreator) TryCreateMatches(players []*QueuePlayer, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface, queueManager *QueueManager) {
	// Need at least 2 players to create a match
	if len(players) < 2 {
		return
	}
	
	// Create a defensive copy to prevent race conditions
	playersCopy := make([]*QueuePlayer, len(players))
	copy(playersCopy, players)
	
	// Match players in pairs with bounds checking
	for i := 0; i < len(playersCopy)-1; i += 2 {
		// Double-check bounds to prevent index out of range panic
		if i+1 >= len(playersCopy) {
			utils.Info("Bounds check failed: trying to access index %d in slice of length %d", i+1, len(playersCopy))
			break
		}
		
		player1 := playersCopy[i]
		player2 := playersCopy[i+1]
		
		// Validate that both players still exist and are valid
		if player1 == nil || player2 == nil {
			utils.Info("Null player encountered at indices %d or %d, skipping match creation", i, i+1)
			continue
		}
		
		// Create match
		if err := mc.createMatch(player1, player2, activeMatches, wsManager, statusManager, queueManager); err != nil {
			utils.Info("Failed to create match between %d and %d: %v", 
				player1.PlayerID, player2.PlayerID, err)
		}
	}
}

// createMatch creates a new match between two players
func (mc *MatchCreator) createMatch(player1, player2 *QueuePlayer, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface, queueManager *QueueManager) error {
	matchID := uuid.New().String()
	
	// Remove players from queue
	queueManager.RemovePlayersFromQueue([]uint{player1.PlayerID, player2.PlayerID})
	
	// Create active match
	activeMatch := &ActiveMatch{
		ID:               matchID,
		Player1ID:        player1.PlayerID,
		Player1Username:  player1.Username,
		Player1Character: player1.SelectedCharacter,
		Player2ID:        player2.PlayerID,
		Player2Username:  player2.Username,
		Player2Character: player2.SelectedCharacter,
		CreatedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(AcceptTimeoutDuration),
	}
	
	activeMatches.AddMatch(matchID, activeMatch)
	
	// Update player statuses
	statusManager.SetPlayerStatus(player1.PlayerID, StatusMatchFound)
	statusManager.SetPlayerStatus(player2.PlayerID, StatusMatchFound)
	
	// Create database record
	dbMatch := &model_modules.OnlineMatch{
		Player1ID:        player1.PlayerID,
		Player1Username:  player1.Username,
		Player1Character: player1.SelectedCharacter,
		Player2ID:        player2.PlayerID,
		Player2Username:  player2.Username,
		Player2Character: player2.SelectedCharacter,
	}
	
	if err := mc.db.Create(dbMatch).Error; err != nil {
		utils.Info("Failed to create database match record: %v", err)
	}
	
	// Send match found messages to both players
	matchData1 := MatchFoundData{
		MatchID:           matchID,
		PlayerCharacter:   player1.SelectedCharacter,
		PlayerUsername:    player1.Username,
		OpponentCharacter: player2.SelectedCharacter,
		OpponentUsername:  player2.Username,
		AcceptTimeoutMs:   int64(AcceptTimeoutDuration.Milliseconds()),
	}
	
	matchData2 := MatchFoundData{
		MatchID:           matchID,
		PlayerCharacter:   player2.SelectedCharacter,
		PlayerUsername:    player2.Username,
		OpponentCharacter: player1.SelectedCharacter,
		OpponentUsername:  player1.Username,
		AcceptTimeoutMs:   int64(AcceptTimeoutDuration.Milliseconds()),
	}
	
	wsManager.SendMessage(player1.PlayerID, WebSocketMessage{
		Type:      MsgTypeMatchFound,
		Message:   "Match found! Do you accept?",
		Data:      matchData1,
		Timestamp: time.Now(),
	})
	
	wsManager.SendMessage(player2.PlayerID, WebSocketMessage{
		Type:      MsgTypeMatchFound,
		Message:   "Match found! Do you accept?",
		Data:      matchData2,
		Timestamp: time.Now(),
	})
	
	utils.Info("Match %s created between %s and %s", matchID, player1.Username, player2.Username)
	return nil
}