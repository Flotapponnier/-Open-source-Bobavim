package survey_handler_modules

import (
	"net/http"
	"strconv"

	"boba-vim/internal/models"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SubmitSurveyVote submits or updates a vote for a survey question
func SubmitSurveyVote(db *gorm.DB, c *gin.Context) {
	var request SubmitSurveyVoteRequest
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}
	
	session := sessions.Default(c)
	playerID, sessionID := getUserIdentification(session, db)
	
	// Check if user has already voted on this question
	var existingVote models.SurveyVote
	whereClause, whereArgs := buildQuestionWhereClause(request.QuestionID, playerID, sessionID)
	
	if err := db.Where(whereClause, whereArgs...).First(&existingVote).Error; err == nil {
		// Update existing vote
		existingVote.Answer = request.Answer
		if err := db.Save(&existingVote).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update vote",
			})
			return
		}
	} else {
		// Create new vote
		vote := models.SurveyVote{
			SurveyID:   request.SurveyID,
			QuestionID: request.QuestionID,
			PlayerID:   playerID,
			SessionID:  sessionID,
			Answer:     request.Answer,
		}
		
		if err := db.Create(&vote).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to submit vote",
			})
			return
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Vote submitted successfully",
	})
}

// DeleteSurveyVote removes a user's vote for a specific question
func DeleteSurveyVote(db *gorm.DB, c *gin.Context) {
	questionID, err := strconv.ParseUint(c.Param("questionId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid question ID",
		})
		return
	}
	
	session := sessions.Default(c)
	sessionID := session.Get("session_id")
	
	if sessionID == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No session found",
		})
		return
	}
	
	playerID, sessionIDStr := getUserIdentification(session, db)
	
	// Delete the vote
	whereClause, whereArgs := buildQuestionWhereClause(uint(questionID), playerID, sessionIDStr)
	
	result := db.Where(whereClause, whereArgs...).Delete(&models.SurveyVote{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete vote",
		})
		return
	}
	
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Vote not found",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Vote deleted successfully",
	})
}

// GetUserVotes returns a user's votes for a specific survey
func GetUserVotes(db *gorm.DB, c *gin.Context) {
	surveyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid survey ID",
		})
		return
	}
	
	session := sessions.Default(c)
	sessionID := session.Get("session_id")
	
	if sessionID == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"votes":   map[string]string{},
		})
		return
	}
	
	playerID, sessionIDStr := getUserIdentification(session, db)
	
	// Get user's votes for this survey
	var votes []models.SurveyVote
	whereClause, whereArgs := buildSurveyWhereClause(uint(surveyID), playerID, sessionIDStr)
	
	if err := db.Where(whereClause, whereArgs...).Find(&votes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch votes",
		})
		return
	}
	
	// Convert to map of question_id -> answer
	userVotes := make(map[uint]string)
	for _, vote := range votes {
		userVotes[vote.QuestionID] = vote.Answer
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"votes":   userVotes,
	})
}