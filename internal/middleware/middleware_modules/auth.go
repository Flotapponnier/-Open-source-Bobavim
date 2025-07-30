package middleware_modules

import (
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"net/http"
)

// RequireAuth middleware - eliminates duplicate auth checks across handlers
func RequireAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("user_id")
		if userID == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "User not authenticated",
			})
			c.Abort()
			return
		}
		// Set user data in context for handlers to use
		c.Set("user_id", userID)
		c.Set("username", session.Get("username"))
		c.Set("is_registered", session.Get("is_registered"))
		c.Next()
	})
}


// OptionalAuth middleware - sets user data if available but doesn't require it
func OptionalAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("user_id")
		if userID != nil {
			c.Set("user_id", userID)
			c.Set("username", session.Get("username"))
			c.Set("is_registered", session.Get("is_registered"))
		}
		c.Next()
	})
}