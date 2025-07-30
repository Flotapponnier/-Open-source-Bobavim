package game_handler_modules

import (
	"net/http"

	"boba-vim/internal/constant"

	"github.com/gin-gonic/gin"
)

// GetMaps returns all available maps
func GetMaps(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"maps":    constant.GAME_MAPS,
	})
}

