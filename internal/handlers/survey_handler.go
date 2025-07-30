package handlers

import (
	"boba-vim/internal/config"
	"boba-vim/internal/handlers/survey_handler_modules"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SurveyHandler struct {
	cfg *config.Config
	db  *gorm.DB
}

func NewSurveyHandler(db *gorm.DB) *SurveyHandler {
	cfg := config.Load()
	return &SurveyHandler{
		cfg: cfg,
		db:  db,
	}
}

// Survey Data Handlers
func (sh *SurveyHandler) GetActiveSurveys(c *gin.Context) {
	survey_handler_modules.GetActiveSurveys(sh.db, c)
}

func (sh *SurveyHandler) GetSurveyResults(c *gin.Context) {
	survey_handler_modules.GetSurveyResults(sh.db, c)
}

// Vote Management Handlers
func (sh *SurveyHandler) SubmitSurveyVote(c *gin.Context) {
	survey_handler_modules.SubmitSurveyVote(sh.db, c)
}

func (sh *SurveyHandler) DeleteSurveyVote(c *gin.Context) {
	survey_handler_modules.DeleteSurveyVote(sh.db, c)
}

func (sh *SurveyHandler) GetUserVotes(c *gin.Context) {
	survey_handler_modules.GetUserVotes(sh.db, c)
}