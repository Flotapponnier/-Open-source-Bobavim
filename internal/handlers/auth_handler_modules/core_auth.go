package auth_handler_modules

import (
	"golang.org/x/crypto/bcrypt"
	"net/http"

	"boba-vim/internal/models"
	"boba-vim/internal/services"
	"boba-vim/internal/services/email"
	"boba-vim/internal/utils"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Register handles user registration
func Register(db *gorm.DB, emailService *email.EmailService, paymentService *services.PaymentService, c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleValidationError(c, err)
		return
	}

	// Clean username and email
	req.Username = CleanUsername(req.Username)
	req.Email = CleanEmail(req.Email)

	// Check if user already exists
	var existingPlayer models.Player
	if err := db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingPlayer).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "Username or email already exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to process password",
		})
		return
	}

	// Create new player
	player := models.Player{
		Username:       req.Username,
		Email:          req.Email,
		Password:       string(hashedPassword),
		IsRegistered:   true,
		EmailConfirmed: false,
	}

	if err := db.Create(&player).Error; err != nil {
		HandleDatabaseError(c, err, "create_account")
		return
	}

	// Generate email confirmation token and send confirmation email
	confirmationToken := player.GenerateEmailConfirmationToken()
	if err := db.Save(&player).Error; err != nil {
		HandleDatabaseError(c, err, "save_confirmation_token")
		return
	}

	// Send confirmation email
	if err := emailService.SendConfirmationEmail(player.Email, confirmationToken); err != nil {
		// Log error but don't fail registration
		// User can still use the account, just won't be confirmed
		utils.Info("Failed to send confirmation email to %s: %v", player.Email, err)
	}

	// Seed default and registration characters for the new user
	if err := paymentService.SeedDefaultCharacters(player.ID); err != nil {
		utils.Info("Failed to seed default characters for user %d: %v", player.ID, err)
	}
	
	if err := paymentService.SeedRegistrationCharacters(player.ID); err != nil {
		utils.Info("Failed to seed registration characters for user %d: %v", player.ID, err)
	}

	// Log the user in immediately after registration
	session := sessions.Default(c)
	session.Set("user_id", player.ID)
	session.Set("username", player.Username)
	session.Set("is_registered", true)
	session.Set("email_confirmed", player.EmailConfirmed)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save session",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Account created successfully! Please confirm your account to have access to all features. (Privileged Gmail account for receiving)",
		"user": gin.H{
			"id":             player.ID,
			"username":       player.Username,
			"email":          player.Email,
			"is_registered":  player.IsRegistered,
			"email_confirmed": player.EmailConfirmed,
		},
	})
}

// Login handles user login
func Login(db *gorm.DB, c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid input: " + err.Error(),
		})
		return
	}

	// Find user by username or email
	var player models.Player
	if err := db.Where("username = ? OR email = ?", req.Username, req.Username).First(&player).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Wrong username or password",
		})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(player.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Wrong username or password",
		})
		return
	}

	// Create session
	session := sessions.Default(c)
	session.Set("user_id", player.ID)
	session.Set("username", player.Username)
	session.Set("is_registered", player.IsRegistered)
	session.Set("email_confirmed", player.EmailConfirmed)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save session",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"user": gin.H{
			"id":             player.ID,
			"username":       player.Username,
			"email":          player.Email,
			"is_registered":  player.IsRegistered,
			"email_confirmed": player.EmailConfirmed,
		},
	})
}

// Logout handles user logout
func Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to logout",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// GetCurrentUser returns current user info
func GetCurrentUser(db *gorm.DB, c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	emailConfirmed := session.Get("email_confirmed")

	if userID == nil {
		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"authenticated": false,
		})
		return
	}

	// Get full user data from database for settings
	var player models.Player
	if err := db.First(&player, userID).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"authenticated": true,
			"user": gin.H{
				"id":             player.ID,
				"username":       player.Username,
				"email":          player.Email,
				"is_registered":  player.IsRegistered,
				"email_confirmed": player.EmailConfirmed,
			},
		})
		return
	}

	// Fallback to session data if database query fails
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"authenticated": true,
		"user": gin.H{
			"id":             userID,
			"username":       username,
			"is_registered":  isRegistered,
			"email_confirmed": emailConfirmed,
		},
	})
}

// ConfirmEmail handles email confirmation
func ConfirmEmail(db *gorm.DB, c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.Redirect(http.StatusSeeOther, "/?error=missing_token")
		return
	}

	var player models.Player
	if err := db.Where("email_confirmation_token = ?", token).First(&player).Error; err != nil {
		c.Redirect(http.StatusSeeOther, "/?error=invalid_token")
		return
	}

	if !player.IsEmailConfirmationTokenValid(token) {
		c.Redirect(http.StatusSeeOther, "/?error=expired_token")
		return
	}

	// Confirm the email
	player.ConfirmEmail()
	if err := db.Save(&player).Error; err != nil {
		c.Redirect(http.StatusSeeOther, "/?error=server_error")
		return
	}

	// Update session if user is logged in
	session := sessions.Default(c)
	if userID := session.Get("user_id"); userID != nil {
		if userID.(uint) == player.ID {
			session.Set("email_confirmed", true)
			session.Save()
		}
	}

	// Redirect to index page with confirmation message
	c.Redirect(http.StatusSeeOther, "/?confirmed=true")
}

// ResendConfirmationEmail handles resending confirmation emails
func ResendConfirmationEmail(db *gorm.DB, emailService *email.EmailService, c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	var player models.Player
	if err := db.First(&player, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	// Check if already confirmed
	if player.EmailConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Email already confirmed",
		})
		return
	}

	// Generate new confirmation token
	confirmationToken := player.GenerateEmailConfirmationToken()
	if err := db.Save(&player).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate confirmation token",
		})
		return
	}

	// Send confirmation email
	if err := emailService.SendConfirmationEmail(player.Email, confirmationToken); err != nil {
		utils.Info("Failed to send confirmation email to %s: %v", player.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send confirmation email",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Confirmation email sent!",
	})
}