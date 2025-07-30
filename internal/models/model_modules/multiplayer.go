package model_modules

import (
	"time"

	"gorm.io/gorm"
)

// MatchmakingQueue represents a player waiting for an online match
type MatchmakingQueue struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	PlayerID          uint      `gorm:"not null;index" json:"player_id"`
	Player            Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	Username          string    `gorm:"not null" json:"username"`
	SelectedCharacter string    `gorm:"default:boba" json:"selected_character"`
	QueuedAt          time.Time `gorm:"not null" json:"queued_at"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// TableName for MatchmakingQueue
func (MatchmakingQueue) TableName() string {
	return "matchmaking_queue"
}

// BeforeCreate sets the queued time
func (mq *MatchmakingQueue) BeforeCreate(tx *gorm.DB) error {
	mq.QueuedAt = time.Now()
	return nil
}

// OnlineMatch represents a matched pair of players
type OnlineMatch struct {
	ID                   uint      `gorm:"primaryKey" json:"id"`
	Player1ID            uint      `gorm:"not null;index" json:"player1_id"`
	Player1              Player    `gorm:"foreignKey:Player1ID" json:"player1,omitempty"`
	Player1Username      string    `gorm:"not null" json:"player1_username"`
	Player1Character     string    `gorm:"default:boba" json:"player1_character"`
	Player1CharacterLevel *int     `gorm:"default:null" json:"player1_character_level"`
	Player2ID            uint      `gorm:"not null;index" json:"player2_id"`
	Player2              Player    `gorm:"foreignKey:Player2ID" json:"player2,omitempty"`
	Player2Username      string    `gorm:"not null" json:"player2_username"`
	Player2Character     string    `gorm:"default:boba" json:"player2_character"`
	Player2CharacterLevel *int     `gorm:"default:null" json:"player2_character_level"`
	MatchedAt            time.Time `gorm:"not null" json:"matched_at"`
	Player1Acknowledged  bool      `gorm:"default:false" json:"player1_acknowledged"`
	Player2Acknowledged  bool      `gorm:"default:false" json:"player2_acknowledged"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// TableName for OnlineMatch
func (OnlineMatch) TableName() string {
	return "online_matches"
}

// BeforeCreate sets the matched time
func (om *OnlineMatch) BeforeCreate(tx *gorm.DB) error {
	om.MatchedAt = time.Now()
	return nil
}

// MultiplayerGameResult represents the outcome of a completed multiplayer game
type MultiplayerGameResult struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	GameSessionID      string    `gorm:"not null;index" json:"game_session_id"`
	MatchID            string    `gorm:"not null;index" json:"match_id"`
	Player1ID          uint      `gorm:"not null;index" json:"player1_id"`
	Player1            Player    `gorm:"foreignKey:Player1ID" json:"player1,omitempty"`
	Player1Username    string    `gorm:"not null" json:"player1_username"`
	Player1Character   string    `gorm:"default:boba" json:"player1_character"`
	Player1CharacterLevel *int   `gorm:"default:null" json:"player1_character_level"`
	Player1FinalScore  int       `gorm:"default:0" json:"player1_final_score"`
	Player2ID          uint      `gorm:"not null;index" json:"player2_id"`
	Player2            Player    `gorm:"foreignKey:Player2ID" json:"player2,omitempty"`
	Player2Username    string    `gorm:"not null" json:"player2_username"`
	Player2Character   string    `gorm:"default:boba" json:"player2_character"`
	Player2CharacterLevel *int   `gorm:"default:null" json:"player2_character_level"`
	Player2FinalScore  int       `gorm:"default:0" json:"player2_final_score"`
	WinnerID           *uint     `gorm:"index" json:"winner_id"`
	Winner             *Player   `gorm:"foreignKey:WinnerID" json:"winner,omitempty"`
	GameDuration       int       `gorm:"default:0" json:"game_duration"` // in seconds
	CompletionType     string    `gorm:"default:normal" json:"completion_type"` // normal, timeout, disconnection
	MapID              uint      `gorm:"not null;index" json:"map_id"`
	CompletedAt        time.Time `gorm:"not null" json:"completed_at"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// TableName for MultiplayerGameResult
func (MultiplayerGameResult) TableName() string {
	return "multiplayer_game_results"
}

// BeforeCreate sets the completion time
func (mgr *MultiplayerGameResult) BeforeCreate(tx *gorm.DB) error {
	mgr.CompletedAt = time.Now()
	return nil
}

// MultiplayerPlayerStats represents aggregated statistics for a player in multiplayer games
type MultiplayerPlayerStats struct {
	ID                    uint      `gorm:"primaryKey" json:"id"`
	PlayerID              uint      `gorm:"not null;uniqueIndex" json:"player_id"`
	Player                Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	Username              string    `gorm:"not null" json:"username"`
	SelectedCharacter     string    `gorm:"default:boba" json:"selected_character"`
	CharacterLevel        *int      `gorm:"default:null" json:"character_level"`
	TotalGamesPlayed      int       `gorm:"default:0" json:"total_games_played"`
	TotalWins             int       `gorm:"default:0" json:"total_wins"`
	TotalLosses           int       `gorm:"default:0" json:"total_losses"`
	TotalTies             int       `gorm:"default:0" json:"total_ties"`
	WinRate               float64   `gorm:"default:0" json:"win_rate"`
	TotalScore            int       `gorm:"default:0" json:"total_score"`
	AverageScore          float64   `gorm:"default:0" json:"average_score"`
	HighestScore          int       `gorm:"default:0" json:"highest_score"`
	TotalGameTimeSeconds  int       `gorm:"default:0" json:"total_game_time_seconds"`
	AverageGameTime       float64   `gorm:"default:0" json:"average_game_time"`
	LastPlayedAt          *time.Time `json:"last_played_at"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// TableName for MultiplayerPlayerStats
func (MultiplayerPlayerStats) TableName() string {
	return "multiplayer_player_stats"
}

// CalculateWinRate calculates the win rate percentage
func (mps *MultiplayerPlayerStats) CalculateWinRate() {
	if mps.TotalGamesPlayed > 0 {
		mps.WinRate = float64(mps.TotalWins) / float64(mps.TotalGamesPlayed) * 100
	} else {
		mps.WinRate = 0
	}
}

// CalculateAverageScore calculates the average score per game
func (mps *MultiplayerPlayerStats) CalculateAverageScore() {
	if mps.TotalGamesPlayed > 0 {
		mps.AverageScore = float64(mps.TotalScore) / float64(mps.TotalGamesPlayed)
	} else {
		mps.AverageScore = 0
	}
}

// CalculateAverageGameTime calculates the average game time in seconds
func (mps *MultiplayerPlayerStats) CalculateAverageGameTime() {
	if mps.TotalGamesPlayed > 0 {
		mps.AverageGameTime = float64(mps.TotalGameTimeSeconds) / float64(mps.TotalGamesPlayed)
	} else {
		mps.AverageGameTime = 0
	}
}