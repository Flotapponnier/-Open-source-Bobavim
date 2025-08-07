package handlers

import (
	"net/http"
	"strconv"
	"time"

	"boba-vim/internal/models"
	"boba-vim/internal/services"
	"boba-vim/internal/services/email"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminHandler struct {
	playerService     *services.PlayerService
	surveyService     *services.SurveyService
	newsletterService *services.NewsletterService
	emailService      *email.EmailService
	db                *gorm.DB
}

func NewAdminHandler(playerService *services.PlayerService, surveyService *services.SurveyService, newsletterService *services.NewsletterService, emailService *email.EmailService, db *gorm.DB) *AdminHandler {
	return &AdminHandler{
		playerService:     playerService,
		surveyService:     surveyService,
		newsletterService: newsletterService,
		emailService:      emailService,
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

// CreateNewsletter creates a new newsletter post and sends emails to confirmed users
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

	// Send newsletter emails to all confirmed users
	go ah.sendNewsletterEmails(newsletter.Title, newsletter.Summary)

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"message":    "Newsletter created successfully and emails are being sent",
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

// sendNewsletterEmails sends newsletter emails to all confirmed users
func (ah *AdminHandler) sendNewsletterEmails(title, summary string) {
	// Get all players with confirmed emails
	var players []models.Player
	if err := ah.db.Where("email_confirmed = ?", true).Find(&players).Error; err != nil {
		// Log error but don't fail the newsletter creation
		return
	}

	// Send emails to all confirmed users
	for _, player := range players {
		if err := ah.emailService.SendNewsletterEmail(player.Email, title, summary); err != nil {
			// Log individual email failures but continue sending to others
			continue
		}
	}
}

// GetUserMetrics returns user statistics for admin dashboard
func (ah *AdminHandler) GetUserMetrics(c *gin.Context) {
	var totalUsers int64
	var confirmedUsers int64
	var activeUsers int64

	// Get total users
	if err := ah.db.Model(&models.Player{}).Count(&totalUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count users"})
		return
	}

	// Get confirmed email users
	if err := ah.db.Model(&models.Player{}).Where("email_confirmed = ?", true).Count(&confirmedUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count confirmed users"})
		return
	}

	// Get active users (played in last 7 days)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	if err := ah.db.Model(&models.Player{}).Where("updated_at > ?", sevenDaysAgo).Count(&activeUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count active users"})
		return
	}

	// Get recent registrations (last 30 days by day)
	var dailySignups []struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	rows, err := ah.db.Raw(`
		SELECT DATE(created_at) as date, COUNT(*) as count 
		FROM players 
		WHERE created_at > ? 
		GROUP BY DATE(created_at) 
		ORDER BY date DESC
	`, thirtyDaysAgo).Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get daily signups"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var signup struct {
			Date  string `json:"date"`
			Count int    `json:"count"`
		}
		if err := rows.Scan(&signup.Date, &signup.Count); err != nil {
			continue
		}
		dailySignups = append(dailySignups, signup)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_users":     totalUsers,
			"confirmed_users": confirmedUsers,
			"active_users":    activeUsers,
			"daily_signups":   dailySignups,
		},
	})
}

// GetGameMetrics returns game statistics for admin dashboard
func (ah *AdminHandler) GetGameMetrics(c *gin.Context) {
	var totalGames int64
	var completedGames int64
	var totalPearls int64
	var avgCompletionTime float64

	// Get total and completed games
	if err := ah.db.Model(&models.GameSession{}).Count(&totalGames).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count total games"})
		return
	}

	if err := ah.db.Model(&models.GameSession{}).Where("is_completed = ?", true).Count(&completedGames).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count completed games"})
		return
	}

	// Get total pearls collected
	var result struct {
		TotalPearls int64 `json:"total_pearls"`
	}
	if err := ah.db.Model(&models.GameSession{}).Select("COALESCE(SUM(pearls_collected), 0) as total_pearls").Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count total pearls"})
		return
	}
	totalPearls = result.TotalPearls

	// Get average completion time for completed games
	var avgResult struct {
		AvgTime float64 `json:"avg_time"`
	}
	if err := ah.db.Model(&models.GameSession{}).Where("is_completed = ? AND completion_time > 0", true).
		Select("AVG(completion_time) as avg_time").Scan(&avgResult).Error; err != nil {
		avgCompletionTime = 0
	} else {
		avgCompletionTime = avgResult.AvgTime
	}

	// Get most popular maps
	var popularMaps []struct {
		MapID   int    `json:"map_id"`
		MapName string `json:"map_name"`
		Count   int    `json:"play_count"`
	}

	mapRows, err := ah.db.Raw(`
		SELECT map_id, 
			CASE map_id 
				WHEN 1 THEN 'Tutorial'
				WHEN 2 THEN 'Basic Movement'
				WHEN 3 THEN 'Word Navigation'
				ELSE CONCAT('Map ', map_id)
			END as map_name,
			COUNT(*) as count
		FROM game_sessions 
		GROUP BY map_id 
		ORDER BY count DESC 
		LIMIT 5
	`).Rows()

	if err == nil {
		defer mapRows.Close()
		for mapRows.Next() {
			var mapStat struct {
				MapID   int    `json:"map_id"`
				MapName string `json:"map_name"`
				Count   int    `json:"play_count"`
			}
			if err := mapRows.Scan(&mapStat.MapID, &mapStat.MapName, &mapStat.Count); err == nil {
				popularMaps = append(popularMaps, mapStat)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_games":          totalGames,
			"completed_games":      completedGames,
			"completion_rate":      float64(completedGames) / float64(totalGames) * 100,
			"total_pearls":         totalPearls,
			"avg_completion_time":  avgCompletionTime,
			"popular_maps":         popularMaps,
		},
	})
}

// GetSystemMetrics returns system statistics for admin dashboard
func (ah *AdminHandler) GetSystemMetrics(c *gin.Context) {
	var newsletterCount int64
	var surveyCount int64
	var errorCount int64

	// Get newsletter count
	if err := ah.db.Model(&models.Newsletter{}).Count(&newsletterCount).Error; err != nil {
		newsletterCount = 0
	}

	// Get survey count
	if err := ah.db.Model(&models.Survey{}).Count(&surveyCount).Error; err != nil {
		surveyCount = 0
	}

	// Get error count from last 24 hours
	twentyFourHoursAgo := time.Now().AddDate(0, 0, -1)
	if err := ah.db.Model(&models.GameError{}).Where("created_at > ?", twentyFourHoursAgo).Count(&errorCount).Error; err != nil {
		errorCount = 0
	}

	// Get recent errors
	var recentErrors []struct {
		ErrorType string    `json:"error_type"`
		Message   string    `json:"message"`
		Count     int       `json:"count"`
		LastSeen  time.Time `json:"last_seen"`
	}

	errorRows, err := ah.db.Raw(`
		SELECT error_type, error_message as message, COUNT(*) as count, MAX(created_at) as last_seen
		FROM game_errors 
		WHERE created_at > ? 
		GROUP BY error_type, error_message 
		ORDER BY count DESC 
		LIMIT 5
	`, twentyFourHoursAgo).Rows()

	if err == nil {
		defer errorRows.Close()
		for errorRows.Next() {
			var errorStat struct {
				ErrorType string    `json:"error_type"`
				Message   string    `json:"message"`
				Count     int       `json:"count"`
				LastSeen  time.Time `json:"last_seen"`
			}
			if err := errorRows.Scan(&errorStat.ErrorType, &errorStat.Message, &errorStat.Count, &errorStat.LastSeen); err == nil {
				recentErrors = append(recentErrors, errorStat)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"newsletter_count": newsletterCount,
			"survey_count":     surveyCount,
			"error_count_24h":  errorCount,
			"recent_errors":    recentErrors,
		},
	})
}

// GetUsersList returns paginated list of users for admin management
func (ah *AdminHandler) GetUsersList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")

	offset := (page - 1) * limit

	query := ah.db.Model(&models.Player{})
	
	// Apply search filter if provided
	if search != "" {
		query = query.Where("username ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var users []models.Player
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Remove sensitive information
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":        users,
			"total":        total,
			"current_page": page,
			"per_page":     limit,
			"total_pages":  (total + int64(limit) - 1) / int64(limit),
		},
	})
}