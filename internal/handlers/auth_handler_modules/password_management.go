package auth_handler_modules

import (
	"golang.org/x/crypto/bcrypt"
	"net/http"

	"boba-vim/internal/models"
	"boba-vim/internal/services/email"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ForgotPassword handles password reset requests
func ForgotPassword(db *gorm.DB, emailService *email.EmailService, c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleValidationError(c, err)
		return
	}

	// Clean email
	req.Email = CleanEmail(req.Email)

	// Check if user exists
	var player models.Player
	if err := db.Where("email = ?", req.Email).First(&player).Error; err != nil {
		// Return error if email doesn't exist
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "No account found with this email address",
		})
		return
	}

	// Generate reset token
	token := player.GenerateResetToken()

	// Save the token to database
	if err := db.Save(&player).Error; err != nil {
		HandleDatabaseError(c, err, "save_reset_token")
		return
	}

	// Send reset email
	if err := emailService.SendPasswordResetEmail(player.Email, token); err != nil {
		// Log error but don't expose it to user
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send reset email. Please try again later.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset link has been sent to your email",
	})
}

// ResetPassword handles password reset with token
func ResetPassword(db *gorm.DB, c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleValidationError(c, err)
		return
	}

	// Find user by reset token
	var player models.Player
	if err := db.Where("reset_token = ?", req.Token).First(&player).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Invalid or expired reset token",
		})
		return
	}

	// Check if token is valid and not expired
	if !player.IsResetTokenValid(req.Token) {
		c.JSON(http.StatusGone, gin.H{
			"success": false,
			"error":   "Reset token has expired. Please request a new password reset.",
		})
		return
	}

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to process new password",
		})
		return
	}

	// Update password and clear reset token
	player.Password = string(hashedPassword)
	player.ClearResetToken()

	if err := db.Save(&player).Error; err != nil {
		HandleDatabaseError(c, err, "update_password")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password updated successfully",
	})
}

// ChangePassword handles password change for authenticated users
func ChangePassword(db *gorm.DB, c *gin.Context) {
	// Check if user is authenticated
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Not authenticated",
		})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleValidationError(c, err)
		return
	}

	// Find user
	var player models.Player
	if err := db.First(&player, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(player.Password), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Current password is incorrect",
		})
		return
	}

	// Check if new password is different
	if err := bcrypt.CompareHashAndPassword([]byte(player.Password), []byte(req.NewPassword)); err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "New password must be different from current password",
		})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to process new password",
		})
		return
	}

	// Update password
	player.Password = string(hashedPassword)
	if err := db.Save(&player).Error; err != nil {
		HandleDatabaseError(c, err, "update_password")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password changed successfully",
	})
}