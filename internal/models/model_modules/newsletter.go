package model_modules

import (
	"time"
	"gorm.io/gorm"
)

// Newsletter represents a newsletter post from Boba Boss
type Newsletter struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"not null;size:255"`
	Content     string         `json:"content" gorm:"type:text;not null"`
	Summary     string         `json:"summary" gorm:"size:500"` // Short summary for the list view
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName returns the table name for Newsletter
func (Newsletter) TableName() string {
	return "newsletters"
}

// BeforeCreate runs before creating a newsletter record
func (n *Newsletter) BeforeCreate(tx *gorm.DB) error {
	if n.Summary == "" && len(n.Content) > 150 {
		// Auto-generate summary from content if not provided
		if len(n.Content) > 150 {
			n.Summary = n.Content[:147] + "..."
		} else {
			n.Summary = n.Content
		}
	}
	return nil
}

// NewsletterRead represents a read record for newsletters per user
type NewsletterRead struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	PlayerID     uint           `json:"player_id" gorm:"not null"`
	NewsletterID uint           `json:"newsletter_id" gorm:"not null"`
	ReadAt       time.Time      `json:"read_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Associations
	Player     Player     `json:"-" gorm:"foreignKey:PlayerID"`
	Newsletter Newsletter `json:"-" gorm:"foreignKey:NewsletterID"`
}

// TableName returns the table name for NewsletterRead
func (NewsletterRead) TableName() string {
	return "newsletter_reads"
}