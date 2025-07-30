package survey_handler_modules

import (
	"strconv"
	"time"

	"boba-vim/internal/models"

	"github.com/gin-contrib/sessions"
	"gorm.io/gorm"
)

// generateSessionID creates a session ID for anonymous users
func generateSessionID() string {
	// Simple session ID generation using current time
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

// getUserIdentification gets user identification info from session
func getUserIdentification(session sessions.Session, db *gorm.DB) (*uint, string) {
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	sessionID := session.Get("session_id")
	
	// Create session ID if it doesn't exist
	if sessionID == nil {
		sessionID = generateSessionID()
		session.Set("session_id", sessionID)
		session.Save()
	}
	
	var playerID *uint
	if username != nil && isRegistered != nil && isRegistered.(bool) {
		// Get player ID for registered users
		var player models.Player
		if err := db.Where("username = ?", username.(string)).First(&player).Error; err == nil {
			playerID = &player.ID
		}
	}
	
	return playerID, sessionID.(string)
}

// buildWhereClause builds the appropriate WHERE clause for database queries based on user type
func buildWhereClause(playerID *uint, sessionID string, additionalFields ...interface{}) (string, []interface{}) {
	var whereClause string
	var whereArgs []interface{}
	
	// Add additional fields to the front of the arguments
	whereArgs = append(whereArgs, additionalFields...)
	
	if playerID != nil {
		whereClause = "player_id = ?"
		whereArgs = append(whereArgs, *playerID)
	} else {
		whereClause = "session_id = ? AND player_id IS NULL"
		whereArgs = append(whereArgs, sessionID)
	}
	
	// If we have additional fields, prepend them to the where clause
	if len(additionalFields) > 0 {
		var additionalClause string
		for i := 0; i < len(additionalFields); i++ {
			if i == 0 {
				additionalClause = "? = ?"
			} else {
				additionalClause += " AND ? = ?"
			}
		}
		whereClause = additionalClause + " AND " + whereClause
	}
	
	return whereClause, whereArgs
}

// buildQuestionWhereClause builds WHERE clause specifically for question-based queries
func buildQuestionWhereClause(questionID uint, playerID *uint, sessionID string) (string, []interface{}) {
	if playerID != nil {
		return "question_id = ? AND player_id = ?", []interface{}{questionID, *playerID}
	}
	return "question_id = ? AND session_id = ? AND player_id IS NULL", []interface{}{questionID, sessionID}
}

// buildSurveyWhereClause builds WHERE clause specifically for survey-based queries
func buildSurveyWhereClause(surveyID uint, playerID *uint, sessionID string) (string, []interface{}) {
	if playerID != nil {
		return "survey_id = ? AND player_id = ?", []interface{}{surveyID, *playerID}
	}
	return "survey_id = ? AND session_id = ? AND player_id IS NULL", []interface{}{surveyID, sessionID}
}