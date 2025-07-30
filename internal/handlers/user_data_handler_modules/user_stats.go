package user_data_handler_modules

import (
	"boba-vim/internal/models"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetUserStats retrieves user's game statistics
func GetUserStats(c *gin.Context, db *gorm.DB) {
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
	err := db.Preload("Favorites").First(&player, userID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch user stats",
		})
		return
	}

	// Extract favorite map IDs
	favoriteMapIDs := make([]int, len(player.Favorites))
	for i, fav := range player.Favorites {
		favoriteMapIDs[i] = fav.MapID
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":               player.ID,
			"username":         player.Username,
			"total_games":      player.TotalGames,
			"completed_games":  player.CompletedGames,
			"best_score":       player.BestScore,
			"fastest_time":     player.FastestTime,
			"favorite_map_ids": favoriteMapIDs,
		},
	})
}