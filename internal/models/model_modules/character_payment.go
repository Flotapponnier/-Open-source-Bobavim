package model_modules

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// CharacterPayment represents a payment made for a character unlock
type CharacterPayment struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	PlayerID         uint      `gorm:"not null;index" json:"player_id"`
	Player           Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	CharacterName    string    `gorm:"not null" json:"character_name"`
	AmountPaid       int       `gorm:"not null" json:"amount_paid"`       // Amount in cents (EUR)
	CharacterLevel   int       `gorm:"not null" json:"character_level"`   // Level based on amount paid
	StripePaymentID  string    `gorm:"unique;not null" json:"stripe_payment_id"`
	PaymentStatus    string    `gorm:"not null;default:'pending'" json:"payment_status"` // pending, completed, failed
	SupportMessage   string    `gorm:"type:varchar(130);default:''" json:"support_message"` // Optional message from supporter
	PaymentDate      time.Time `gorm:"not null" json:"payment_date"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// TableName for CharacterPayment
func (CharacterPayment) TableName() string {
	return "character_payments"
}

// BeforeCreate sets the payment date
func (cp *CharacterPayment) BeforeCreate(tx *gorm.DB) error {
	cp.PaymentDate = time.Now()
	return nil
}

// CalculateCharacterLevel calculates character level based on amount paid
// 1 euro = level 1, 20 euros = level 20, etc.
func (cp *CharacterPayment) CalculateCharacterLevel() {
	cp.CharacterLevel = cp.AmountPaid / 100 // Convert cents to euros
	if cp.CharacterLevel < 1 {
		cp.CharacterLevel = 1
	}
}

// GetCharacterTitleSuffix returns the level suffix for character display
func (cp *CharacterPayment) GetCharacterTitleSuffix() string {
	if cp.CharacterLevel > 1 {
		return fmt.Sprintf(" Level %d", cp.CharacterLevel)
	}
	return ""
}

// PlayerCharacterOwnership represents characters owned by a player
type PlayerCharacterOwnership struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	PlayerID      uint      `gorm:"not null;index" json:"player_id"`
	Player        Player    `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	CharacterName string    `gorm:"not null" json:"character_name"`
	Level         int       `gorm:"not null;default:1" json:"level"`
	UnlockMethod  string    `gorm:"not null" json:"unlock_method"` // "registration", "payment", "default"
	PaymentID     *uint     `gorm:"index" json:"payment_id,omitempty"`
	Payment       *CharacterPayment `gorm:"foreignKey:PaymentID" json:"payment,omitempty"`
	UnlockedAt    time.Time `gorm:"not null" json:"unlocked_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// TableName for PlayerCharacterOwnership
func (PlayerCharacterOwnership) TableName() string {
	return "player_character_ownerships"
}

// BeforeCreate sets the unlocked time
func (pco *PlayerCharacterOwnership) BeforeCreate(tx *gorm.DB) error {
	pco.UnlockedAt = time.Now()
	return nil
}

// GetDisplayName returns the character name with level suffix if applicable
func (pco *PlayerCharacterOwnership) GetDisplayName() string {
	if pco.Level > 1 {
		return fmt.Sprintf("%s Level %d", pco.CharacterName, pco.Level)
	}
	return pco.CharacterName
}