package handlers

import (
	"net/http"
	"strconv"

	"boba-vim/internal/services"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type NewsletterHandler struct {
	newsletterService *services.NewsletterService
}

func NewNewsletterHandler(newsletterService *services.NewsletterService) *NewsletterHandler {
	return &NewsletterHandler{
		newsletterService: newsletterService,
	}
}

// GetNewsletters returns all active newsletters for public consumption
func (nh *NewsletterHandler) GetNewsletters(c *gin.Context) {
	session := sessions.Default(c)
	playerID := session.Get("player_id")

	if playerID != nil {
		// User is logged in, return newsletters with read status
		newsletters, err := nh.newsletterService.GetNewslettersWithReadStatus(playerID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch newsletters"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"newsletters": newsletters,
		})
	} else {
		// User not logged in, return newsletters with read status as false
		newsletters, err := nh.newsletterService.GetActiveNewsletters()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch newsletters"})
			return
		}

		// Add is_read: false for unauthenticated users
		result := make([]map[string]interface{}, len(newsletters))
		for i, newsletter := range newsletters {
			result[i] = map[string]interface{}{
				"id":         newsletter.ID,
				"title":      newsletter.Title,
				"content":    newsletter.Content,
				"summary":    newsletter.Summary,
				"is_active":  newsletter.IsActive,
				"created_at": newsletter.CreatedAt,
				"updated_at": newsletter.UpdatedAt,
				"is_read":    false, // Default to unread for unauthenticated users
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"newsletters": result,
		})
	}
}

// GetNewsletter returns a specific newsletter by ID
func (nh *NewsletterHandler) GetNewsletter(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid newsletter ID"})
		return
	}

	newsletter, err := nh.newsletterService.GetNewsletterByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}

	// Mark as read if user is logged in
	session := sessions.Default(c)
	playerID := session.Get("player_id")
	if playerID != nil {
		nh.newsletterService.MarkNewsletterAsRead(playerID.(uint), uint(id))
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"newsletter": newsletter,
	})
}

// MarkNewsletterAsRead marks a newsletter as read for the current user
func (nh *NewsletterHandler) MarkNewsletterAsRead(c *gin.Context) {
	session := sessions.Default(c)
	playerID := session.Get("player_id")

	if playerID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid newsletter ID"})
		return
	}

	err = nh.newsletterService.MarkNewsletterAsRead(playerID.(uint), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark newsletter as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Newsletter marked as read",
	})
}