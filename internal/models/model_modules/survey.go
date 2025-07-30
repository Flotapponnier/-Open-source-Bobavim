package model_modules

import (
	"time"

	"gorm.io/gorm"
)

// Survey represents a survey with multiple questions
type Survey struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	// Relationships
	Questions []SurveyQuestion `gorm:"foreignKey:SurveyID" json:"questions,omitempty"`
	Votes     []SurveyVote     `gorm:"foreignKey:SurveyID" json:"votes,omitempty"`
}

// SurveyQuestion represents a question within a survey
type SurveyQuestion struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	SurveyID   uint   `gorm:"not null;index" json:"survey_id"`
	Survey     Survey `gorm:"foreignKey:SurveyID" json:"survey,omitempty"`
	QuestionText string `gorm:"not null" json:"question_text"`
	QuestionType string `gorm:"not null" json:"question_type"` // "rating", "multiple_choice", "text"
	Options      string `json:"options"` // JSON array for multiple choice options
	MinValue     *int   `json:"min_value"` // For rating questions
	MaxValue     *int   `json:"max_value"` // For rating questions
	IsRequired   bool   `gorm:"default:true" json:"is_required"`
	SortOrder    int    `gorm:"default:1;column:sort_order" json:"order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// SurveyVote represents a user's vote on a survey
type SurveyVote struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	SurveyID       uint      `gorm:"not null;index" json:"survey_id"`
	Survey         Survey    `gorm:"foreignKey:SurveyID" json:"survey,omitempty"`
	QuestionID     uint      `gorm:"not null;index" json:"question_id"`
	Question       SurveyQuestion `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	PlayerID       *uint     `gorm:"index" json:"player_id"` // Null for anonymous users
	Player         *Player   `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
	SessionID      string    `gorm:"index" json:"session_id"` // For anonymous users
	Answer         string    `gorm:"not null" json:"answer"` // The actual vote/answer
	VotedAt        time.Time `gorm:"not null" json:"voted_at"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TableName for Survey
func (Survey) TableName() string {
	return "surveys"
}

// TableName for SurveyQuestion
func (SurveyQuestion) TableName() string {
	return "survey_questions"
}

// TableName for SurveyVote
func (SurveyVote) TableName() string {
	return "survey_votes"
}

// BeforeCreate sets the voted time
func (sv *SurveyVote) BeforeCreate(tx *gorm.DB) error {
	sv.VotedAt = time.Now()
	return nil
}