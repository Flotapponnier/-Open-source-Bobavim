package handlers

import (
	"boba-vim/internal/models"
	"boba-vim/internal/services"
	"boba-vim/internal/services/email"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/paymentintent"
	"github.com/stripe/stripe-go/v74/webhook"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	db             *gorm.DB
	paymentService *services.PaymentService
	emailService   *email.EmailService
}

func NewPaymentHandler(db *gorm.DB, paymentService *services.PaymentService, emailService *email.EmailService) *PaymentHandler {
	return &PaymentHandler{
		db:             db,
		paymentService: paymentService,
		emailService:   emailService,
	}
}

type CreatePaymentIntentRequest struct {
	Amount        int    `json:"amount" binding:"required,min=100"`         // Minimum 1 euro (100 cents)
	CharacterName string `json:"character_name" binding:"required"`
	Currency      string `json:"currency"`
	SupportMessage string `json:"support_message"`                          // Optional message from supporter
}

type CreatePaymentIntentResponse struct {
	ClientSecret string `json:"client_secret"`
	PaymentID    string `json:"payment_id"`
}

// CreatePaymentIntent creates a Stripe payment intent for character purchase
func (h *PaymentHandler) CreatePaymentIntent(c *gin.Context) {
	// Get player from session
	playerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Must be logged in to purchase characters"})
		return
	}

	var req CreatePaymentIntentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default currency to EUR
	if req.Currency == "" {
		req.Currency = "eur"
	}

	// Validate character name
	if req.CharacterName != "boba_diamond" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only boba_diamond character is available for purchase"})
		return
	}

	// Validate support message
	if req.SupportMessage != "" {
		if err := validateSupportMessage(req.SupportMessage); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	// Check if player already owns this character
	var existingOwnership models.PlayerCharacterOwnership
	err := h.db.Where("player_id = ? AND character_name = ?", playerID, req.CharacterName).First(&existingOwnership).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Character already owned"})
		return
	}

	// Create payment intent with Stripe
	params := &stripe.PaymentIntentParams{
		Amount:      stripe.Int64(int64(req.Amount)),
		Currency:    stripe.String(req.Currency),
		Description: stripe.String("Boba Diamond Character Purchase"),
	}
	
	params.AddMetadata("player_id", strconv.Itoa(int(playerID.(uint))))
	params.AddMetadata("character_name", req.CharacterName)

	pi, err := paymentintent.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment intent"})
		return
	}

	// Create pending payment record
	payment := models.CharacterPayment{
		PlayerID:        playerID.(uint),
		CharacterName:   req.CharacterName,
		AmountPaid:      req.Amount,
		StripePaymentID: pi.ID,
		PaymentStatus:   "pending",
		SupportMessage:  req.SupportMessage,
	}
	payment.CalculateCharacterLevel()

	if err := h.db.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
		return
	}

	c.JSON(http.StatusOK, CreatePaymentIntentResponse{
		ClientSecret: pi.ClientSecret,
		PaymentID:    pi.ID,
	})
}

// ConfirmPayment confirms a successful payment and unlocks the character
func (h *PaymentHandler) ConfirmPayment(c *gin.Context) {
	paymentID := c.Param("payment_id")
	
	// Get player from session
	playerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Must be logged in"})
		return
	}

	// Find the payment record
	var payment models.CharacterPayment
	err := h.db.Where("stripe_payment_id = ? AND player_id = ?", paymentID, playerID).First(&payment).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Verify payment with Stripe
	pi, err := paymentintent.Get(paymentID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify payment"})
		return
	}

	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment not successful"})
		return
	}

	// Update payment status
	payment.PaymentStatus = "completed"
	if err := h.db.Save(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payment status"})
		return
	}

	// Create character ownership record
	ownership := models.PlayerCharacterOwnership{
		PlayerID:      playerID.(uint),
		CharacterName: payment.CharacterName,
		Level:         payment.CharacterLevel,
		UnlockMethod:  "payment",
		PaymentID:     &payment.ID,
	}

	if err := h.db.Create(&ownership).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlock character"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Character unlocked successfully",
		"character_name":   payment.CharacterName,
		"character_level":  payment.CharacterLevel,
		"display_name":     ownership.GetDisplayName(),
	})
}

// GetPlayerCharacters returns all characters owned by the player
func (h *PaymentHandler) GetPlayerCharacters(c *gin.Context) {
	playerID, exists := c.Get("user_id")
	if !exists {
		// Try to get from session directly
		session := sessions.Default(c)
		sessionUserID := session.Get("user_id")
		if sessionUserID != nil {
			playerID = sessionUserID
		} else {
			// Debug: log session contents
			log.Printf("DEBUG: Session user_id not found. Session: %+v", session)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Must be logged in"})
			return
		}
	}
	
	log.Printf("DEBUG: Player ID: %v", playerID)

	var ownerships []models.PlayerCharacterOwnership
	err := h.db.Where("player_id = ?", playerID).Preload("Payment").Find(&ownerships).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch characters"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"characters": ownerships,
	})
}

// GetCharacterPaymentHistory returns payment history for a player
func (h *PaymentHandler) GetCharacterPaymentHistory(c *gin.Context) {
	playerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Must be logged in"})
		return
	}

	var payments []models.CharacterPayment
	err := h.db.Where("player_id = ?", playerID).Order("created_at DESC").Find(&payments).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payments": payments,
	})
}

// validateSupportMessage validates support message for character payments
func validateSupportMessage(message string) error {
	// Check length
	if len(message) > 130 {
		return fmt.Errorf("support message must be 130 characters or less")
	}
	
	// Check if message contains only ASCII characters
	for _, char := range message {
		if char > unicode.MaxASCII {
			return fmt.Errorf("support message must contain only ASCII characters")
		}
	}
	
	// Check for potentially dangerous patterns (basic XSS prevention)
	dangerousPatterns := []string{
		"<script", "</script>", "javascript:", "onclick=", "onerror=", "onload=",
		"<iframe", "</iframe>", "eval(", "alert(", "confirm(", "prompt(",
	}
	
	lowerMessage := strings.ToLower(message)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowerMessage, pattern) {
			return fmt.Errorf("support message contains prohibited content")
		}
	}
	
	return nil
}

// GetBobaDiamondSupporters returns all Boba Diamond supporters sorted by level (highest first)
func (h *PaymentHandler) GetBobaDiamondSupporters(c *gin.Context) {
	var supporters []models.PlayerCharacterOwnership
	
	// Get all Boba Diamond owners with their payment information, sorted by level (highest first)
	err := h.db.Preload("Player").Preload("Payment").
		Where("character_name = ? AND unlock_method = ?", "boba_diamond", "payment").
		Order("level DESC").
		Find(&supporters).Error
		
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch supporters"})
		return
	}
	
	// Transform the data for the frontend
	var supportersList []map[string]interface{}
	for _, supporter := range supporters {
		supporterData := map[string]interface{}{
			"username": supporter.Player.Username,
			"level":    supporter.Level,
			"message":  "",
		}
		
		// Add support message if payment exists
		if supporter.Payment != nil {
			supporterData["message"] = supporter.Payment.SupportMessage
		}
		
		supportersList = append(supportersList, supporterData)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"supporters": supportersList,
	})
}

// HandleStripeWebhook handles Stripe webhook events for secure payment verification
func (h *PaymentHandler) HandleStripeWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
	
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Verify webhook signature
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if endpointSecret == "" {
		log.Printf("Stripe webhook secret not configured")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Webhook not configured"})
		return
	}

	signatureHeader := c.GetHeader("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, signatureHeader, endpointSecret)
	if err != nil {
		log.Printf("Webhook signature verification failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature"})
		return
	}

	// Handle the event
	switch event.Type {
	case "payment_intent.succeeded":
		var paymentIntent stripe.PaymentIntent
		err := json.Unmarshal(event.Data.Raw, &paymentIntent)
		if err != nil {
			log.Printf("Error parsing webhook JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			return
		}

		// Process the successful payment
		if err := h.processSuccessfulPayment(&paymentIntent); err != nil {
			log.Printf("Error processing successful payment: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Processing failed"})
			return
		}

		log.Printf("Payment succeeded webhook processed: %s", paymentIntent.ID)
	default:
		log.Printf("Unhandled webhook event type: %s", event.Type)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// processSuccessfulPayment handles the business logic when a payment succeeds
func (h *PaymentHandler) processSuccessfulPayment(paymentIntent *stripe.PaymentIntent) error {
	// Find the payment record
	var payment models.CharacterPayment
	err := h.db.Where("stripe_payment_id = ?", paymentIntent.ID).First(&payment).Error
	if err != nil {
		return fmt.Errorf("payment record not found: %v", err)
	}

	// Skip if already processed
	if payment.PaymentStatus == "completed" {
		log.Printf("Payment %s already processed", paymentIntent.ID)
		return nil
	}

	// Begin database transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update payment status
	payment.PaymentStatus = "completed"
	if err := tx.Save(&payment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update payment status: %v", err)
	}

	// Create or update character ownership
	var ownership models.PlayerCharacterOwnership
	err = tx.Where("player_id = ? AND character_name = ?", payment.PlayerID, payment.CharacterName).First(&ownership).Error
	
	if err == gorm.ErrRecordNotFound {
		// Create new ownership record
		ownership = models.PlayerCharacterOwnership{
			PlayerID:      payment.PlayerID,
			CharacterName: payment.CharacterName,
			Level:         payment.CharacterLevel,
			UnlockMethod:  "payment",
			PaymentID:     &payment.ID,
		}
		
		if err := tx.Create(&ownership).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to create character ownership: %v", err)
		}
	} else if err != nil {
		tx.Rollback()
		return fmt.Errorf("database error: %v", err)
	} else {
		// Update existing ownership if new level is higher
		if payment.CharacterLevel > ownership.Level {
			ownership.Level = payment.CharacterLevel
			ownership.PaymentID = &payment.ID
			
			if err := tx.Save(&ownership).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to update character ownership: %v", err)
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	// Send thank you email
	if err := h.sendPaymentSuccessEmail(&payment, &ownership); err != nil {
		log.Printf("Failed to send payment success email: %v", err)
		// Don't fail the webhook processing if email fails
	}

	return nil
}

// sendPaymentSuccessEmail sends a thank you email with invoice details
func (h *PaymentHandler) sendPaymentSuccessEmail(payment *models.CharacterPayment, ownership *models.PlayerCharacterOwnership) error {
	if h.emailService == nil || !h.emailService.IsConfigured() {
		log.Printf("Email service not configured - would send payment success email")
		return nil
	}

	// Get player information
	var player models.Player
	if err := h.db.First(&player, payment.PlayerID).Error; err != nil {
		return fmt.Errorf("failed to get player info: %v", err)
	}

	// Format amount (convert cents to euros)
	amountEuros := float64(payment.AmountPaid) / 100

	subject := "🧋 Thank you for supporting Boba.vim!"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Thank You - Boba.vim</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B4513;">🧋 Boba.vim</h1>
        </div>
        
        <h2 style="color: #333;">Thank You for Your Support!</h2>
        
        <p>Hello %s!</p>
        
        <p>Thank you so much for supporting Boba.vim! Your payment has been successfully processed and your <strong>Diamond Boba character (Level %d)</strong> is now unlocked and ready to use.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B4513; margin-top: 0;">Purchase Details</h3>
            <p><strong>Character:</strong> %s (Level %d)</p>
            <p><strong>Amount Paid:</strong> €%.2f</p>
            <p><strong>Payment ID:</strong> %s</p>
            <p><strong>Date:</strong> %s</p>
            %s
        </div>
        
        <p>Your Diamond Boba character is now available in the character selection menu. You can use it in both single-player and multiplayer games!</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.bobavim.com" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Play Now</a>
        </div>
        
        <p>Your support helps keep Boba.vim running and allows us to continue developing new features and improvements. Thank you for being part of our community!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #888;">
            If you have any questions about your purchase or need assistance, please don't hesitate to reach out to us.
        </p>
        
        <p style="font-size: 12px; color: #888;">
            Best regards,<br>
            The Boba.vim Team
        </p>
    </div>
</body>
</html>
`, 
		player.Username,
		ownership.Level,
		ownership.GetDisplayName(),
		ownership.Level,
		amountEuros,
		payment.StripePaymentID,
		payment.CreatedAt.Format("January 2, 2006 at 3:04 PM"),
		func() string {
			if payment.SupportMessage != "" {
				return fmt.Sprintf("<p><strong>Your Message:</strong> %s</p>", payment.SupportMessage)
			}
			return ""
		}(),
	)

	return h.emailService.SendEmail(player.Email, subject, body)
}