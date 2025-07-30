package survey_handler_modules

import (
	"net/http"
	"strconv"

	"boba-vim/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetActiveSurveys returns all active surveys with their questions
func GetActiveSurveys(db *gorm.DB, c *gin.Context) {
	var surveys []models.Survey
	
	if err := db.Where("is_active = ?", true).
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Find(&surveys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch surveys",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"surveys": surveys,
	})
}

// GetSurveyResults returns results for a specific survey
func GetSurveyResults(db *gorm.DB, c *gin.Context) {
	surveyID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid survey ID",
		})
		return
	}
	
	// Get survey with questions
	var survey models.Survey
	if err := db.Where("id = ?", surveyID).
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		First(&survey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Survey not found",
		})
		return
	}
	
	// Calculate results for each question
	results := make(map[uint]interface{})
	
	for _, question := range survey.Questions {
		if question.QuestionType == "rating" {
			results[question.ID] = calculateRatingResults(db, question.ID)
		} else if question.QuestionType == "multiple_choice" {
			results[question.ID] = calculateMultipleChoiceResults(db, question.ID)
		} else if question.QuestionType == "text" {
			results[question.ID] = calculateTextResults(db, question.ID)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"survey":  survey,
		"results": results,
	})
}

// calculateRatingResults calculates results for rating questions
func calculateRatingResults(db *gorm.DB, questionID uint) gin.H {
	var votes []models.SurveyVote
	if err := db.Where("question_id = ?", questionID).Find(&votes).Error; err != nil {
		return gin.H{
			"type":        "rating",
			"total_votes": 0,
			"average":     0.0,
		}
	}
	
	totalVotes := len(votes)
	if totalVotes == 0 {
		return gin.H{
			"type":        "rating",
			"total_votes": 0,
			"average":     0.0,
		}
	}
	
	totalScore := 0
	for _, vote := range votes {
		if rating, err := strconv.Atoi(vote.Answer); err == nil {
			totalScore += rating
		}
	}
	
	average := float64(totalScore) / float64(totalVotes)
	
	return gin.H{
		"type":        "rating",
		"total_votes": totalVotes,
		"average":     average,
		"total_score": totalScore,
	}
}

// calculateMultipleChoiceResults calculates results for multiple choice questions
func calculateMultipleChoiceResults(db *gorm.DB, questionID uint) gin.H {
	var votes []models.SurveyVote
	if err := db.Where("question_id = ?", questionID).Find(&votes).Error; err != nil {
		return gin.H{
			"type":         "multiple_choice",
			"total_votes":  0,
			"option_counts": make(map[string]int),
		}
	}
	
	optionCounts := make(map[string]int)
	totalVotes := len(votes)
	
	for _, vote := range votes {
		optionCounts[vote.Answer]++
	}
	
	return gin.H{
		"type":         "multiple_choice",
		"total_votes":  totalVotes,
		"option_counts": optionCounts,
	}
}

// calculateTextResults calculates results for text questions
func calculateTextResults(db *gorm.DB, questionID uint) gin.H {
	var votes []models.SurveyVote
	if err := db.Where("question_id = ?", questionID).Find(&votes).Error; err != nil {
		return gin.H{
			"type":        "text",
			"total_votes": 0,
			"responses":   []string{},
		}
	}
	
	totalVotes := len(votes)
	responses := make([]string, totalVotes)
	
	for i, vote := range votes {
		responses[i] = vote.Answer
	}
	
	return gin.H{
		"type":        "text",
		"total_votes": totalVotes,
		"responses":   responses,
	}
}