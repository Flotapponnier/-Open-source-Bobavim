package user_data_handler_modules

import (
	"boba-vim/internal/models"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UpdateBestTime updates user's best time for a map
func UpdateBestTime(c *gin.Context, db *gorm.DB) {
	session := sessions.Default(c)
	userID := session.Get("user_id")

	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	var req UpdateBestTimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	// Get current user to check/update fastest time
	var player models.Player
	err := db.First(&player, userID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	isNewRecord := false
	var previousBestTime *int64

	// Check if player already has a best score for this specific map
	var existingScore models.PlayerBestScore
	err = db.Where("player_id = ? AND map_id = ?", userID, req.MapID).First(&existingScore).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve best time",
		})
		return
	}

	// If no existing score for this map, this is a new record
	if err == gorm.ErrRecordNotFound {
		isNewRecord = true
		previousBestTime = nil
	} else {
		// Compare with existing best time for this map
		previousBestTime = &existingScore.FastestTime
		if req.CompletionTime < existingScore.FastestTime {
			isNewRecord = true
		}
	}

	// Update overall fastest time if this is better
	if player.FastestTime == nil || req.CompletionTime < *player.FastestTime {
		player.FastestTime = &req.CompletionTime
		err = db.Save(&player).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update overall best time",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"is_new_record": isNewRecord,
		"fastest_time":  previousBestTime,
		"message":       "Best time updated",
	})
}