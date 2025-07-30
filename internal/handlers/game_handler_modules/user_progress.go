package game_handler_modules

import (
	"net/http"

	"boba-vim/internal/models"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetCompletedMaps returns the list of completed maps for a player
func GetCompletedMaps(db *gorm.DB, c *gin.Context) {
	session := sessions.Default(c)
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	
	// If not registered, return empty list
	if username == nil || isRegistered == nil || !isRegistered.(bool) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"completed_maps": []int{},
		})
		return
	}
	
	// Get player ID from username
	var player models.Player
	if err := db.Where("username = ?", username.(string)).First(&player).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"completed_maps": []int{},
		})
		return
	}
	
	// Get completed maps
	var completions []models.MapCompletion
	if err := db.Where("player_id = ?", player.ID).Find(&completions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": "Failed to fetch completed maps",
		})
		return
	}
	
	// Extract map IDs
	var completedMapIDs []int
	for _, completion := range completions {
		completedMapIDs = append(completedMapIDs, completion.MapID)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"completed_maps": completedMapIDs,
	})
}

// MigrateGuestProgress migrates guest progress when they create an account
func MigrateGuestProgress(db *gorm.DB, c *gin.Context) {
	var request MigrateGuestProgressRequest
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": "Invalid request format",
		})
		return
	}
	
	session := sessions.Default(c)
	username := session.Get("username")
	isRegistered := session.Get("is_registered")
	
	// Only registered users can migrate progress
	if username == nil || isRegistered == nil || !isRegistered.(bool) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": "Must be logged in to migrate progress",
		})
		return
	}
	
	// Get player ID from username
	var player models.Player
	if err := db.Where("username = ?", username.(string)).First(&player).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": "Player not found",
		})
		return
	}
	
	// Create MapCompletion records for each completed map
	for _, mapID := range request.GuestCompletedMaps {
		// Check if completion already exists
		var existingCompletion models.MapCompletion
		err := db.Where("player_id = ? AND map_id = ?", player.ID, mapID).First(&existingCompletion).Error
		
		// If not found, create new completion record
		if err == gorm.ErrRecordNotFound {
			completion := models.MapCompletion{
				PlayerID: player.ID,
				MapID:    mapID,
			}
			db.Create(&completion)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Guest progress migrated successfully",
	})
}