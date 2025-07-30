package middleware_modules

import (
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func Sessions(secretKey string) gin.HandlerFunc {
	store := cookie.NewStore([]byte(secretKey))
	
	// Detect production environment - use secure cookies for HTTPS
	isProduction := os.Getenv("ENV") != "development"
	
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
		Secure:   isProduction, // true in production with HTTPS, false in development
	})

	return sessions.Sessions("boba-vim-session", store)
}