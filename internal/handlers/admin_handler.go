package handlers

import (
	"net/http"
	"strconv"
	"time"

	"boba-vim/internal/models"
	"boba-vim/internal/services"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminHandler struct {
	playerService     *services.PlayerService
	surveyService     *services.SurveyService
	newsletterService *services.NewsletterService
	db                *gorm.DB
}

func NewAdminHandler(playerService *services.PlayerService, surveyService *services.SurveyService, newsletterService *services.NewsletterService, db *gorm.DB) *AdminHandler {
	return &AdminHandler{
		playerService:     playerService,
		surveyService:     surveyService,
		newsletterService: newsletterService,
		db:                db,
	}
}

// AdminLogin handles admin login
func (ah *AdminHandler) AdminLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Find admin by username
	var admin models.Admin
	if err := ah.db.Where("username = ? AND is_active = ?", req.Username, true).First(&admin).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials", "redirect": "/"})
		return
	}

	// Check password
	if !admin.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials", "redirect": "/"})
		return
	}

	// Generate session token
	if err := admin.GenerateSessionToken(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Update last login time
	now := time.Now()
	admin.LastLoginAt = &now

	// Save session
	if err := ah.db.Save(&admin).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save session"})
		return
	}

	// Store admin session
	session := sessions.Default(c)
	session.Set("admin_id", admin.ID)
	session.Set("admin_token", admin.SessionToken)
	session.Save()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"admin": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
		},
	})
}

// AdminLogout handles admin logout
func (ah *AdminHandler) AdminLogout(c *gin.Context) {
	session := sessions.Default(c)
	
	// Clear admin session from database
	if adminID := session.Get("admin_id"); adminID != nil {
		var admin models.Admin
		if err := ah.db.Where("id = ?", adminID).First(&admin).Error; err == nil {
			admin.ClearSession()
			ah.db.Save(&admin)
		}
	}
	
	// Clear session
	session.Delete("admin_id")
	session.Delete("admin_token")
	session.Save()

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
}

// RequireAdmin middleware to check admin authentication
func (ah *AdminHandler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		adminID := session.Get("admin_id")
		adminToken := session.Get("admin_token")

		if adminID == nil || adminToken == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin authentication required"})
			c.Abort()
			return
		}

		// Verify admin session
		var admin models.Admin
		if err := ah.db.Where("id = ? AND session_token = ? AND is_active = ?", adminID, adminToken, true).First(&admin).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid admin session"})
			c.Abort()
			return
		}

		// Check if session is still valid
		if !admin.IsSessionValid() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin session expired"})
			c.Abort()
			return
		}

		// Store admin in context for use in handlers
		c.Set("admin", &admin)
		c.Next()
	}
}

// CheckAdminStatus checks if current user is admin (for frontend button visibility)
func (ah *AdminHandler) CheckAdminStatus(c *gin.Context) {
	session := sessions.Default(c)
	adminID := session.Get("admin_id")
	adminToken := session.Get("admin_token")

	if adminID == nil || adminToken == nil {
		c.JSON(http.StatusOK, gin.H{"is_admin": false})
		return
	}

	// Verify admin session
	var admin models.Admin
	if err := ah.db.Where("id = ? AND session_token = ? AND is_active = ?", adminID, adminToken, true).First(&admin).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"is_admin": false})
		return
	}

	// Check if session is still valid
	if !admin.IsSessionValid() {
		c.JSON(http.StatusOK, gin.H{"is_admin": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"is_admin": true,
		"username": admin.Username,
	})
}

// CreateNewsletter creates a new newsletter post
func (ah *AdminHandler) CreateNewsletter(c *gin.Context) {
	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
		Summary string `json:"summary"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	newsletter := models.Newsletter{
		Title:    req.Title,
		Content:  req.Content,
		Summary:  req.Summary,
		IsActive: true,
	}

	if err := ah.db.Create(&newsletter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create newsletter"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"message":    "Newsletter created successfully",
		"newsletter": newsletter,
	})
}

// CreateSurvey creates a new survey (replaces the previous one)
func (ah *AdminHandler) CreateSurvey(c *gin.Context) {
	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		Question    struct {
			Text     string `json:"text" binding:"required"`
			Type     string `json:"type" binding:"required"`
			MinValue *int   `json:"min_value"`
			MaxValue *int   `json:"max_value"`
			Options  string `json:"options"`
		} `json:"question" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Begin transaction
	tx := ah.db.Begin()

	// Deactivate all existing surveys
	if err := tx.Model(&models.Survey{}).Where("is_active = ?", true).Update("is_active", false).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate existing surveys"})
		return
	}

	// Create new survey
	survey := models.Survey{
		Title:       req.Title,
		Description: req.Description,
		IsActive:    true,
	}

	if err := tx.Create(&survey).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create survey"})
		return
	}

	// Create survey question
	question := models.SurveyQuestion{
		SurveyID:     survey.ID,
		QuestionText: req.Question.Text,
		QuestionType: req.Question.Type,
		MinValue:     req.Question.MinValue,
		MaxValue:     req.Question.MaxValue,
		Options:      req.Question.Options,
		IsRequired:   true,
		SortOrder:    1,
	}

	if err := tx.Create(&question).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create survey question"})
		return
	}

	// Commit transaction
	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Survey created successfully",
		"survey":  survey,
	})
}

// GetNewsletters returns all newsletters for admin management
func (ah *AdminHandler) GetNewsletters(c *gin.Context) {
	var newsletters []models.Newsletter
	if err := ah.db.Order("created_at DESC").Find(&newsletters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch newsletters"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"newsletters": newsletters,
	})
}

// DeleteNewsletter removes a newsletter
func (ah *AdminHandler) DeleteNewsletter(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid newsletter ID"})
		return
	}

	if err := ah.db.Delete(&models.Newsletter{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete newsletter"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Newsletter deleted successfully",
	})
}