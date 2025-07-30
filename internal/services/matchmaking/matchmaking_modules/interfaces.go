package matchmaking_modules

import (
	"time"
)

// Re-export types from parent package to avoid circular imports
type MatchmakingStatus string
type MessageType string
type WebSocketMessage struct {
	Type      MessageType `json:"type"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

type QueuePlayer struct {
	PlayerID          uint      `json:"player_id"`
	Username          string    `json:"username"`
	SelectedCharacter string    `json:"selected_character"`
	QueuedAt          time.Time `json:"queued_at"`
}

type ActiveMatch struct {
	ID                string
	Player1ID         uint
	Player1Username   string
	Player1Character  string
	Player2ID         uint
	Player2Username   string
	Player2Character  string
	CreatedAt         time.Time
	ExpiresAt         time.Time
	Player1Accepted   bool
	Player2Accepted   bool
	Player1Responded  bool
	Player2Responded  bool
}

type MatchFoundData struct {
	MatchID           string `json:"match_id"`
	PlayerCharacter   string `json:"player_character"`
	PlayerUsername    string `json:"player_username"`
	OpponentCharacter string `json:"opponent_character"`
	OpponentUsername  string `json:"opponent_username"`
	AcceptTimeoutMs   int64  `json:"accept_timeout_ms"`
}

type MatchStartData struct {
	MatchID         string `json:"match_id"`
	GameSessionID   string `json:"game_session_id"`
	Map             string `json:"map"`
	GameServerURL   string `json:"game_server_url"`
	Player1Username string `json:"player1_username"`
	Player2Username string `json:"player2_username"`
}

// Constants
const (
	StatusIdle           MatchmakingStatus = "idle"
	StatusSearching      MatchmakingStatus = "searching"
	StatusMatchFound     MatchmakingStatus = "match_found"
	StatusWaitingAccept  MatchmakingStatus = "waiting_accept"
	StatusMatchAccepted  MatchmakingStatus = "match_accepted"
	StatusMatchRejected  MatchmakingStatus = "match_rejected"
	StatusInGame         MatchmakingStatus = "in_game"
	
	MsgTypeQueueJoined       MessageType = "queue_joined"
	MsgTypeQueueLeft         MessageType = "queue_left"
	MsgTypeQueueTimeout      MessageType = "queue_timeout"
	MsgTypeMatchFound        MessageType = "match_found"
	MsgTypeMatchAccepted     MessageType = "match_accepted"
	MsgTypeOpponentAccepted  MessageType = "opponent_accepted"
	MsgTypeMatchRejected     MessageType = "match_rejected"
	MsgTypeOpponentRejected  MessageType = "opponent_rejected"
	MsgTypeMatchStarted      MessageType = "match_started"
	MsgTypeMatchCancelled    MessageType = "match_cancelled"
	MsgTypeError             MessageType = "error"
	
	QueueTimeoutDuration  = 45 * time.Second
	AcceptTimeoutDuration = 30 * time.Second
	MaxQueueSize          = 1000
)

// Error definitions (re-exported)
type MatchmakingError struct {
	Message string
}

func (e MatchmakingError) Error() string {
	return e.Message
}

var (
	ErrPlayerNotConnected    = MatchmakingError{"player not connected"}
	ErrPlayerAlreadyInQueue  = MatchmakingError{"player already in queue"}
	ErrPlayerNotInQueue      = MatchmakingError{"player not in queue"}
	ErrMatchNotFound         = MatchmakingError{"match not found"}
	ErrMatchAlreadyAccepted  = MatchmakingError{"match already accepted"}
	ErrMatchExpired          = MatchmakingError{"match expired"}
	ErrInvalidMatchAction    = MatchmakingError{"invalid match action"}
)

// Interfaces
type WebSocketManager interface {
	IsPlayerConnected(playerID uint) bool
	SendMessage(playerID uint, message interface{}) error
}

type MultiplayerGameStarter interface {
	StartMultiplayerGame(matchID string, player1ID uint, player1Username, player1Character string, player2ID uint, player2Username, player2Character string) error
}

type ActiveMatchesInterface interface {
	AddMatch(matchID string, match *ActiveMatch)
	GetMatch(matchID string) (*ActiveMatch, bool)
	RemoveMatch(matchID string)
	GetExpiredMatches(now time.Time) []*ActiveMatch
	Cleanup()
}

type StatusInterface interface {
	SetPlayerStatus(playerID uint, status MatchmakingStatus)
	GetPlayerStatus(playerID uint) MatchmakingStatus
	Cleanup()
}