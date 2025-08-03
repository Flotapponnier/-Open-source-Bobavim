package auth_handler_modules

import (
	"net/http"

	"boba-vim/internal/models"
	"boba-vim/internal/utils"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DeleteAccount handles account deletion for authenticated users
func DeleteAccount(db *gorm.DB, c *gin.Context) {
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

	// Find user
	var player models.Player
	if err := db.First(&player, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	// Delete user and related data (cascading delete)
	if err := db.Delete(&player).Error; err != nil {
		HandleDatabaseError(c, err, "delete_account")
		return
	}

	// Clear session
	session.Clear()
	if err := session.Save(); err != nil {
		// Don't fail the delete operation if session clear fails
		utils.Info("Failed to clear session after account deletion: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account deleted successfully",
	})
}