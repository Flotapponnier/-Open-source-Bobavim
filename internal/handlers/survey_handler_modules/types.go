package survey_handler_modules

// Request types for survey handlers
type SubmitSurveyVoteRequest struct {
	SurveyID   uint   `json:"survey_id" binding:"required"`
	QuestionID uint   `json:"question_id" binding:"required"`
	Answer     string `json:"answer" binding:"required"`
}