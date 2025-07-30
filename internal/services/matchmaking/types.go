package matchmaking

import (
	"errors"
	"time"
)

// Error definitions
var (
	ErrPlayerNotConnected    = errors.New("player not connected")
	ErrPlayerAlreadyInQueue  = errors.New("player already in queue")
	ErrPlayerNotInQueue      = errors.New("player not in queue")
	ErrMatchNotFound         = errors.New("match not found")
	ErrMatchAlreadyAccepted  = errors.New("match already accepted")
	ErrMatchExpired          = errors.New("match expired")
	ErrInvalidMatchAction    = errors.New("invalid match action")
)

// MatchmakingStatus represents the current status of a player
type MatchmakingStatus string

const (
	StatusIdle           MatchmakingStatus = "idle"
	StatusSearching      MatchmakingStatus = "searching"
	StatusMatchFound     MatchmakingStatus = "match_found"
	StatusWaitingAccept  MatchmakingStatus = "waiting_accept"
	StatusMatchAccepted  MatchmakingStatus = "match_accepted"
	StatusMatchRejected  MatchmakingStatus = "match_rejected"
	StatusInGame         MatchmakingStatus = "in_game"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
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
	MsgTypeHeartbeat         MessageType = "heartbeat"
)

// WebSocketMessage represents a message sent through WebSocket
type WebSocketMessage struct {
	Type      MessageType `json:"type"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// QueuePlayer represents a player in the matchmaking queue
type QueuePlayer struct {
	PlayerID          uint      `json:"player_id"`
	Username          string    `json:"username"`
	SelectedCharacter string    `json:"selected_character"`
	QueuedAt          time.Time `json:"queued_at"`
}

// MatchFoundData represents the data sent when a match is found
type MatchFoundData struct {
	MatchID           string `json:"match_id"`
	PlayerCharacter   string `json:"player_character"`
	PlayerUsername    string `json:"player_username"`
	OpponentCharacter string `json:"opponent_character"`
	OpponentUsername  string `json:"opponent_username"`
	AcceptTimeoutMs   int64  `json:"accept_timeout_ms"`
}

// MatchAcceptanceData represents the data for match acceptance
type MatchAcceptanceData struct {
	MatchID  string `json:"match_id"`
	PlayerID uint   `json:"player_id"`
	Accepted bool   `json:"accepted"`
}

// MatchStartData represents the data when a match starts
type MatchStartData struct {
	MatchID         string `json:"match_id"`
	GameSessionID   string `json:"game_session_id"`
	Map             string `json:"map"`
	GameServerURL   string `json:"game_server_url"`
	Player1Username string `json:"player1_username"`
	Player2Username string `json:"player2_username"`
}

// QueueJoinRequest represents a request to join the matchmaking queue
type QueueJoinRequest struct {
	SelectedCharacter string `json:"selected_character"`
}

// Constants for timeouts and limits
const (
	QueueTimeoutDuration     = 45 * time.Second // 45 seconds queue timeout
	AcceptTimeoutDuration    = 30 * time.Second // 30 seconds to accept match
	MatchCleanupDuration     = 5 * time.Minute  // 5 minutes to cleanup expired matches
	MaxQueueSize             = 1000             // Maximum number of players in queue
	HeartbeatInterval        = 30 * time.Second // Heartbeat interval
)

// GameResult represents the result of a completed game
type GameResult struct {
	MatchID       string        `json:"match_id"`
	WinnerID      uint          `json:"winner_id"`
	LoserID       uint          `json:"loser_id"`
	WinnerTime    time.Duration `json:"winner_time"`
	LoserTime     time.Duration `json:"loser_time"`
	GameDuration  time.Duration `json:"game_duration"`
	CompletedAt   time.Time     `json:"completed_at"`
}

// PlayerStats represents player statistics
type PlayerStats struct {
	PlayerID     uint    `json:"player_id"`
	TotalMatches int     `json:"total_matches"`
	Wins         int     `json:"wins"`
	Losses       int     `json:"losses"`
	WinRate      float64 `json:"win_rate"`
	AverageTime  float64 `json:"average_time"`
	BestTime     float64 `json:"best_time"`
	Rank         int     `json:"rank"`
}