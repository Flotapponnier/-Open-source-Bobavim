package middleware_modules

import (
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// For production, only allow your specific domain
		// For development, allow localhost
		allowedOrigins := []string{
			"https://www.bobavim.com",
			"https://bobavim.com", 
			"http://localhost:8080",
		}
		
		// Check if the origin is allowed
		originAllowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				originAllowed = true
				break
			}
		}
		
		// For same-origin requests (no Origin header), allow them
		if origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "https://www.bobavim.com")
			originAllowed = true
		}
		
		// Only set credentials header if origin is allowed
		if originAllowed {
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
}