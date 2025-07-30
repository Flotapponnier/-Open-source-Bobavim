package services

import (
	"boba-vim/internal/models"
	"gorm.io/gorm"
)

type SurveyService struct {
	db *gorm.DB
}

func NewSurveyService(db *gorm.DB) *SurveyService {
	return &SurveyService{db: db}
}

// GetActiveSurveys returns all active surveys with their questions
func (ss *SurveyService) GetActiveSurveys() ([]models.Survey, error) {
	var surveys []models.Survey
	err := ss.db.Where("is_active = ?", true).Preload("Questions").Find(&surveys).Error
	return surveys, err
}

// GetSurveyByID returns a specific survey by ID with its questions
func (ss *SurveyService) GetSurveyByID(id uint) (*models.Survey, error) {
	var survey models.Survey
	err := ss.db.Where("id = ?", id).Preload("Questions").First(&survey).Error
	if err != nil {
		return nil, err
	}
	return &survey, nil
}

// CreateSurvey creates a new survey
func (ss *SurveyService) CreateSurvey(survey *models.Survey) error {
	return ss.db.Create(survey).Error
}

// UpdateSurvey updates an existing survey
func (ss *SurveyService) UpdateSurvey(survey *models.Survey) error {
	return ss.db.Save(survey).Error
}

// DeactivateAllSurveys sets all surveys as inactive
func (ss *SurveyService) DeactivateAllSurveys() error {
	return ss.db.Model(&models.Survey{}).Where("is_active = ?", true).Update("is_active", false).Error
}

// CreateSurveyQuestion creates a new survey question
func (ss *SurveyService) CreateSurveyQuestion(question *models.SurveyQuestion) error {
	return ss.db.Create(question).Error
}

// GetSurveyResults returns survey results with vote counts and averages
func (ss *SurveyService) GetSurveyResults(surveyID uint) (map[string]interface{}, error) {
	var survey models.Survey
	if err := ss.db.Where("id = ?", surveyID).Preload("Questions").First(&survey).Error; err != nil {
		return nil, err
	}

	results := map[string]interface{}{
		"survey": survey,
		"results": []map[string]interface{}{},
	}

	var questionResults []map[string]interface{}

	for _, question := range survey.Questions {
		var votes []models.SurveyVote
		if err := ss.db.Where("question_id = ?", question.ID).Find(&votes).Error; err != nil {
			continue
		}

		questionResult := map[string]interface{}{
			"question_id":   question.ID,
			"question_text": question.QuestionText,
			"question_type": question.QuestionType,
			"total_votes":   len(votes),
		}

		if question.QuestionType == "rating" {
			// Calculate average rating
			var total float64
			for _, vote := range votes {
				if vote.Answer != "" {
					if rating := parseRating(vote.Answer); rating > 0 {
						total += float64(rating)
					}
				}
			}
			if len(votes) > 0 {
				questionResult["average_rating"] = total / float64(len(votes))
			}
		}

		// Group responses by answer
		answerCounts := make(map[string]int)
		for _, vote := range votes {
			answerCounts[vote.Answer]++
		}

		var responses []map[string]interface{}
		for answer, count := range answerCounts {
			responses = append(responses, map[string]interface{}{
				"answer": answer,
				"count":  count,
			})
		}
		questionResult["responses"] = responses

		questionResults = append(questionResults, questionResult)
	}

	results["results"] = questionResults
	return results, nil
}

// SubmitVote submits a vote for a survey question
func (ss *SurveyService) SubmitVote(vote *models.SurveyVote) error {
	return ss.db.Create(vote).Error
}

// GetUserVotes returns a user's votes for a survey
func (ss *SurveyService) GetUserVotes(surveyID uint, playerID *uint, sessionID string) ([]models.SurveyVote, error) {
	var votes []models.SurveyVote
	query := ss.db.Where("survey_id = ?", surveyID)
	
	if playerID != nil {
		query = query.Where("player_id = ?", *playerID)
	} else {
		query = query.Where("session_id = ? AND player_id IS NULL", sessionID)
	}
	
	err := query.Find(&votes).Error
	return votes, err
}

// DeleteUserVote deletes a user's vote for a specific question
func (ss *SurveyService) DeleteUserVote(questionID uint, playerID *uint, sessionID string) error {
	query := ss.db.Where("question_id = ?", questionID)
	
	if playerID != nil {
		query = query.Where("player_id = ?", *playerID)
	} else {
		query = query.Where("session_id = ? AND player_id IS NULL", sessionID)
	}
	
	return query.Delete(&models.SurveyVote{}).Error
}

// Helper function to parse rating from string
func parseRating(answer string) int {
	switch answer {
	case "1": return 1
	case "2": return 2
	case "3": return 3
	case "4": return 4
	case "5": return 5
	case "6": return 6
	case "7": return 7
	case "8": return 8
	case "9": return 9
	case "10": return 10
	default: return 0
	}
}