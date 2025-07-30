package middleware

import (
	"github.com/gin-gonic/gin"
	"boba-vim/internal/middleware/middleware_modules"
)

func CORS() gin.HandlerFunc {
	return middleware_modules.CORS()
}

func Sessions(secretKey string) gin.HandlerFunc {
	return middleware_modules.Sessions(secretKey)
}

func Logger() gin.HandlerFunc {
	return middleware_modules.Logger()
}

func RequireAuth() gin.HandlerFunc {
	return middleware_modules.RequireAuth()
}

func OptionalAuth() gin.HandlerFunc {
	return middleware_modules.OptionalAuth()
}
