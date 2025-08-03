package matchmaking_modules

import (
	"time"

	"boba-vim/internal/models/model_modules"
	"boba-vim/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MatchLifecycleManager handles match acceptance, rejection, and starting
type MatchLifecycleManager struct {
	db          *gorm.DB
	gameStarter MultiplayerGameStarter
}

// NewMatchLifecycleManager creates a new match lifecycle manager
func NewMatchLifecycleManager(db *gorm.DB, gameStarter MultiplayerGameStarter) *MatchLifecycleManager {
	return &MatchLifecycleManager{
		db:          db,
		gameStarter: gameStarter,
	}
}

// AcceptMatch handles a player accepting a match
func (mlm *MatchLifecycleManager) AcceptMatch(matchID string, playerID uint, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) error {
	match, exists := activeMatches.GetMatch(matchID)
	if !exists {
		return ErrMatchNotFound
	}
	
	// Check if match has expired
	if time.Now().After(match.ExpiresAt) {
		return ErrMatchExpired
	}
	
	// Mark player as accepted
	if match.Player1ID == playerID {
		if match.Player1Responded {
			return ErrMatchAlreadyAccepted
		}
		match.Player1Accepted = true
		match.Player1Responded = true
	} else if match.Player2ID == playerID {
		if match.Player2Responded {
			return ErrMatchAlreadyAccepted
		}
		match.Player2Accepted = true
		match.Player2Responded = true
	} else {
		return ErrInvalidMatchAction
	}
	
	// Update player status
	statusManager.SetPlayerStatus(playerID, StatusWaitingAccept)
	
	// Check if both players accepted
	if match.Player1Accepted && match.Player2Accepted {
		return mlm.startMatch(match, activeMatches, wsManager, statusManager)
	}
	
	// If only one player accepted, wait for the other
	// Send confirmation to the accepting player
	wsManager.SendMessage(playerID, WebSocketMessage{
		Type:      MsgTypeMatchAccepted,
		Message:   "Match accepted. Waiting for opponent...",
		Timestamp: time.Now(),
	})
	
	// Notify the other player that their opponent has accepted
	var otherPlayerID uint
	if match.Player1ID == playerID {
		otherPlayerID = match.Player2ID
	} else {
		otherPlayerID = match.Player1ID
	}
	
	wsManager.SendMessage(otherPlayerID, WebSocketMessage{
		Type:      MsgTypeOpponentAccepted,
		Message:   "Your opponent has accepted the match!",
		Timestamp: time.Now(),
	})
	
	return nil
}

// RejectMatch handles a player rejecting a match
func (mlm *MatchLifecycleManager) RejectMatch(matchID string, playerID uint, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) error {
	match, exists := activeMatches.GetMatch(matchID)
	if !exists {
		return ErrMatchNotFound
	}
	
	// Mark player as rejected
	if match.Player1ID == playerID {
		match.Player1Accepted = false
		match.Player1Responded = true
	} else if match.Player2ID == playerID {
		match.Player2Accepted = false
		match.Player2Responded = true
	} else {
		return ErrInvalidMatchAction
	}
	
	// Cancel the match
	return mlm.cancelMatch(match, playerID, activeMatches, wsManager, statusManager)
}

// cancelMatch cancels a match and notifies players
func (mlm *MatchLifecycleManager) cancelMatch(match *ActiveMatch, rejectingPlayerID uint, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) error {
	// Remove from active matches
	activeMatches.RemoveMatch(match.ID)
	
	// Update player statuses
	statusManager.SetPlayerStatus(match.Player1ID, StatusIdle)
	statusManager.SetPlayerStatus(match.Player2ID, StatusIdle)
	
	// Remove from database
	mlm.db.Where("(player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?)", 
		match.Player1ID, match.Player2ID, match.Player2ID, match.Player1ID).
		Delete(&model_modules.OnlineMatch{})
	
	// Send rejection messages
	if rejectingPlayerID == match.Player1ID {
		wsManager.SendMessage(match.Player1ID, WebSocketMessage{
			Type:      MsgTypeMatchRejected,
			Message:   "You rejected the match",
			Timestamp: time.Now(),
		})
		wsManager.SendMessage(match.Player2ID, WebSocketMessage{
			Type:      MsgTypeOpponentRejected,
			Message:   "Your opponent rejected the match",
			Timestamp: time.Now(),
		})
	} else {
		wsManager.SendMessage(match.Player2ID, WebSocketMessage{
			Type:      MsgTypeMatchRejected,
			Message:   "You rejected the match",
			Timestamp: time.Now(),
		})
		wsManager.SendMessage(match.Player1ID, WebSocketMessage{
			Type:      MsgTypeOpponentRejected,
			Message:   "Your opponent rejected the match",
			Timestamp: time.Now(),
		})
	}
	
	utils.Info("Match %s cancelled by player %d", match.ID, rejectingPlayerID)
	return nil
}

// startMatch starts a match when both players accept
func (mlm *MatchLifecycleManager) startMatch(match *ActiveMatch, activeMatches ActiveMatchesInterface, wsManager WebSocketManager, statusManager StatusInterface) error {
	// Remove from active matches
	activeMatches.RemoveMatch(match.ID)
	
	// Update player statuses
	statusManager.SetPlayerStatus(match.Player1ID, StatusMatchAccepted)
	statusManager.SetPlayerStatus(match.Player2ID, StatusMatchAccepted)
	
	// Start the multiplayer game
	if mlm.gameStarter != nil {
		err := mlm.gameStarter.StartMultiplayerGame(
			match.ID,
			match.Player1ID,
			match.Player1Username,
			match.Player1Character,
			match.Player2ID,
			match.Player2Username,
			match.Player2Character,
		)
		
		if err != nil {
			utils.Info("Failed to start multiplayer game: %v", err)
			
			// Send error messages to both players
			errorMessage := WebSocketMessage{
				Type:      MsgTypeError,
				Message:   "Failed to start game. Please try again.",
				Timestamp: time.Now(),
			}
			
			wsManager.SendMessage(match.Player1ID, errorMessage)
			wsManager.SendMessage(match.Player2ID, errorMessage)
			
			return err
		}
	}
	
	// Generate game session ID for redirection
	gameSessionID := uuid.New().String()
	
	startData := MatchStartData{
		MatchID:         match.ID,
		GameSessionID:   gameSessionID,
		Map:             "default", // Will be determined by the game service
		GameServerURL:   "/play",   // Redirect to game page
		Player1Username: match.Player1Username,
		Player2Username: match.Player2Username,
	}
	
	wsManager.SendMessage(match.Player1ID, WebSocketMessage{
		Type:      MsgTypeMatchStarted,
		Message:   "Match started! Redirecting to game...",
		Data:      startData,
		Timestamp: time.Now(),
	})
	
	wsManager.SendMessage(match.Player2ID, WebSocketMessage{
		Type:      MsgTypeMatchStarted,
		Message:   "Match started! Redirecting to game...",
		Data:      startData,
		Timestamp: time.Now(),
	})
	
	utils.Info("Match %s started between %s and %s", match.ID, match.Player1Username, match.Player2Username)
	return nil
}