package model_modules

import (
	"crypto/rand"
	"encoding/hex"
	"time"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Admin represents an admin user with special privileges
type Admin struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	Username          string         `json:"username" gorm:"uniqueIndex;not null;size:50"`
	PasswordHash      string         `json:"-" gorm:"not null;size:255"`
	IsActive          bool           `json:"is_active" gorm:"default:true"`
	LastLoginAt       *time.Time     `json:"last_login_at"`
	SessionToken      string         `json:"-" gorm:"size:255"`
	SessionExpiresAt  *time.Time     `json:"-"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName returns the table name for Admin
func (Admin) TableName() string {
	return "admins"
}

// SetPassword sets the password hash for the admin
func (a *Admin) SetPassword(password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	a.PasswordHash = string(hash)
	return nil
}

// CheckPassword verifies the password against the stored hash
func (a *Admin) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(password))
	return err == nil
}

// GenerateSessionToken creates a new session token for the admin
func (a *Admin) GenerateSessionToken() error {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return err
	}
	a.SessionToken = hex.EncodeToString(bytes)
	// Session expires in 24 hours
	expiresAt := time.Now().Add(24 * time.Hour)
	a.SessionExpiresAt = &expiresAt
	return nil
}

// IsSessionValid checks if the current session token is still valid
func (a *Admin) IsSessionValid() bool {
	if a.SessionToken == "" || a.SessionExpiresAt == nil {
		return false
	}
	return time.Now().Before(*a.SessionExpiresAt)
}

// ClearSession removes the session token
func (a *Admin) ClearSession() {
	a.SessionToken = ""
	a.SessionExpiresAt = nil
}