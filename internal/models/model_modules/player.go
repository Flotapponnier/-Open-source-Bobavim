package model_modules

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Player struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"unique;not null" json:"username"`
	Email        string    `gorm:"unique;not null" json:"email"`
	Password     string    `gorm:"not null" json:"-"` // Don't include in JSON responses
	IsRegistered bool      `gorm:"default:false" json:"is_registered"`
	
	// Password reset fields
	ResetToken       *string    `gorm:"index" json:"-"` // Don't include in JSON responses
	ResetTokenExpiry *time.Time `json:"-"`              // Don't include in JSON responses
	
	// Email confirmation fields
	EmailConfirmed           bool       `gorm:"default:false" json:"email_confirmed"`
	EmailConfirmationToken   *string    `gorm:"index" json:"-"` // Don't include in JSON responses
	EmailConfirmationExpiry  *time.Time `json:"-"`              // Don't include in JSON responses
	
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// Stats
	TotalGames     int  `json:"total_games"`
	CompletedGames int  `json:"completed_games"`
	BestScore      int  `json:"best_score"`
	TotalPearls    int  `json:"total_pearls"`
	TotalMoves     int  `json:"total_moves"`
	FastestTime    *int64 `json:"fastest_time"`

	// Relationships
	Favorites []UserFavorite `json:"favorites,omitempty"`
}

// GenerateResetToken generates a new password reset token
func (p *Player) GenerateResetToken() string {
	token := uuid.New().String()
	expiry := time.Now().Add(1 * time.Hour) // Token expires in 1 hour
	
	p.ResetToken = &token
	p.ResetTokenExpiry = &expiry
	
	return token
}

// IsResetTokenValid checks if the reset token is valid and not expired
func (p *Player) IsResetTokenValid(token string) bool {
	if p.ResetToken == nil || p.ResetTokenExpiry == nil {
		return false
	}
	
	return *p.ResetToken == token && time.Now().Before(*p.ResetTokenExpiry)
}

// ClearResetToken clears the reset token and expiry
func (p *Player) ClearResetToken() {
	p.ResetToken = nil
	p.ResetTokenExpiry = nil
}

// GenerateEmailConfirmationToken generates a new email confirmation token
func (p *Player) GenerateEmailConfirmationToken() string {
	token := uuid.New().String()
	expiry := time.Now().Add(24 * time.Hour) // Token expires in 24 hours
	
	p.EmailConfirmationToken = &token
	p.EmailConfirmationExpiry = &expiry
	
	return token
}

// IsEmailConfirmationTokenValid checks if the email confirmation token is valid and not expired
func (p *Player) IsEmailConfirmationTokenValid(token string) bool {
	if p.EmailConfirmationToken == nil || p.EmailConfirmationExpiry == nil {
		return false
	}
	
	return *p.EmailConfirmationToken == token && time.Now().Before(*p.EmailConfirmationExpiry)
}

// ClearEmailConfirmationToken clears the email confirmation token and expiry
func (p *Player) ClearEmailConfirmationToken() {
	p.EmailConfirmationToken = nil
	p.EmailConfirmationExpiry = nil
}

// ConfirmEmail confirms the email address
func (p *Player) ConfirmEmail() {
	p.EmailConfirmed = true
	p.ClearEmailConfirmationToken()
}

// UserFavorite represents a user's favorite map
type UserFavorite struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PlayerID  uint      `gorm:"not null;index" json:"player_id"`
	Player    Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	MapID     int       `gorm:"not null" json:"map_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName for UserFavorite
func (UserFavorite) TableName() string {
	return "user_favorites"
}

// PlayerBestScore represents a player's best score for a specific map
type PlayerBestScore struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	PlayerID          uint      `gorm:"not null;index" json:"player_id"`
	Player            Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	MapID             int       `gorm:"not null;index" json:"map_id"`
	BestScore         int       `gorm:"not null" json:"best_score"`
	FastestTime       int64     `gorm:"not null" json:"fastest_time"` // in milliseconds
	TotalMoves        int       `gorm:"not null" json:"total_moves"`
	PearlsCollected   int       `gorm:"not null" json:"pearls_collected"`
	SelectedCharacter string    `gorm:"default:boba" json:"selected_character"`
	CharacterLevel    *int      `gorm:"default:null" json:"character_level"`
	CompletedAt       time.Time `gorm:"not null" json:"completed_at"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// TableName for PlayerBestScore
func (PlayerBestScore) TableName() string {
	return "player_best_scores"
}

// BeforeCreate sets the completed time
func (pbs *PlayerBestScore) BeforeCreate(tx *gorm.DB) error {
	pbs.CompletedAt = time.Now()
	return nil
}

// MapCompletion represents a completed map by a player (for progression tracking)
type MapCompletion struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PlayerID  uint      `gorm:"not null;index" json:"player_id"`
	Player    Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	MapID     int       `gorm:"not null;index" json:"map_id"`
	CompletedAt time.Time `gorm:"not null" json:"completed_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName for MapCompletion
func (MapCompletion) TableName() string {
	return "map_completions"
}

// BeforeCreate sets the completed time
func (mc *MapCompletion) BeforeCreate(tx *gorm.DB) error {
	mc.CompletedAt = time.Now()
	return nil
}