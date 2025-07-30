package user_data_handler_modules

import (
	"boba-vim/internal/models"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetUserFavorites retrieves user's favorite maps
func GetUserFavorites(c *gin.Context, db *gorm.DB) {
	session := sessions.Default(c)
	userID := session.Get("user_id")

	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	var favorites []models.UserFavorite
	err := db.Where("player_id = ?", userID).Find(&favorites).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch favorites",
		})
		return
	}

	// Extract just the map IDs for frontend compatibility
	mapIDs := make([]int, len(favorites))
	for i, fav := range favorites {
		mapIDs[i] = fav.MapID
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"favorites": mapIDs,
	})
}

// AddToFavorites adds a map to user's favorites
func AddToFavorites(c *gin.Context, db *gorm.DB) {
	session := sessions.Default(c)
	userID := session.Get("user_id")

	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	// Check if already exists
	var existing models.UserFavorite
	err := db.Where("player_id = ? AND map_id = ?", userID, req.MapID).First(&existing).Error
	if err == nil {
		// Already exists
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Map already in favorites",
		})
		return
	}

	// Create new favorite
	favorite := models.UserFavorite{
		PlayerID: userID.(uint),
		MapID:    req.MapID,
	}

	err = db.Create(&favorite).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to add to favorites",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Map added to favorites",
	})
}

// RemoveFromFavorites removes a map from user's favorites
func RemoveFromFavorites(c *gin.Context, db *gorm.DB) {
	session := sessions.Default(c)
	userID := session.Get("user_id")

	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	var req RemoveFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	err := db.Where("player_id = ? AND map_id = ?", userID, req.MapID).Delete(&models.UserFavorite{}).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to remove from favorites",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Map removed from favorites",
	})
}