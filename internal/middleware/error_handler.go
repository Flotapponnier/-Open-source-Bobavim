package middleware

import (
	"github.com/gin-gonic/gin"
	"boba-vim/internal/middleware/middleware_modules"
)

func ErrorHandler() gin.HandlerFunc {
	return middleware_modules.ErrorHandler()
}
