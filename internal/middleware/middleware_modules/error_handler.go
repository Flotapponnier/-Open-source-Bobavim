package middleware_modules

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

func ErrorHandler() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				log.Printf("Panic recovered: %v", err)
				log.Printf("Stack trace:\n%s", debug.Stack())

				// Check if response has already been written
				if !c.Writer.Written() {
					// Render 500 page for HTML requests, JSON for API requests
					if c.GetHeader("Accept") == "application/json" ||
						c.Request.URL.Path[:4] == "/api" {
						c.JSON(http.StatusInternalServerError, gin.H{
							"success": false,
							"error":   "Internal server error",
						})
					} else {
						c.HTML(http.StatusInternalServerError, "500_go.html", gin.H{
							"title": "Boba.vim - Internal Server Error",
							"error": "An unexpected error occurred. Please try again later.",
						})
					}
				}
				c.Abort()
			}
		}()
		c.Next()
	})
}