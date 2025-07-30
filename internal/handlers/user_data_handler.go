package handlers

import (
	"boba-vim/internal/handlers/user_data_handler_modules"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserDataHandler struct {
	DB *gorm.DB
}

func NewUserDataHandler(db *gorm.DB) *UserDataHandler {
	return &UserDataHandler{DB: db}
}

// GetUserFavorites retrieves user's favorite maps
func (h *UserDataHandler) GetUserFavorites(c *gin.Context) {
	user_data_handler_modules.GetUserFavorites(c, h.DB)
}

// AddToFavorites adds a map to user's favorites
func (h *UserDataHandler) AddToFavorites(c *gin.Context) {
	user_data_handler_modules.AddToFavorites(c, h.DB)
}

// RemoveFromFavorites removes a map from user's favorites
func (h *UserDataHandler) RemoveFromFavorites(c *gin.Context) {
	user_data_handler_modules.RemoveFromFavorites(c, h.DB)
}

// UpdateBestTime updates user's best time for a map
func (h *UserDataHandler) UpdateBestTime(c *gin.Context) {
	user_data_handler_modules.UpdateBestTime(c, h.DB)
}

// GetUserStats retrieves user's game statistics
func (h *UserDataHandler) GetUserStats(c *gin.Context) {
	user_data_handler_modules.GetUserStats(c, h.DB)
}
