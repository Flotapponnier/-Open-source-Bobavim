package handlers

import (
	"boba-vim/internal/handlers/auth_handler_modules"
	"boba-vim/internal/services"
	"boba-vim/internal/services/email"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db             *gorm.DB
	emailService   *email.EmailService
	paymentService *services.PaymentService
}

func NewAuthHandler(db *gorm.DB, paymentService *services.PaymentService) *AuthHandler {
	return &AuthHandler{
		db:             db,
		emailService:   email.NewEmailServiceFromEnv(),
		paymentService: paymentService,
	}
}

// Register handles user registration
func (ah *AuthHandler) Register(c *gin.Context) {
	auth_handler_modules.Register(ah.db, ah.emailService, ah.paymentService, c)
}

// Login handles user login
func (ah *AuthHandler) Login(c *gin.Context) {
	auth_handler_modules.Login(ah.db, c)
}

// Logout handles user logout
func (ah *AuthHandler) Logout(c *gin.Context) {
	auth_handler_modules.Logout(c)
}

// ForgotPassword handles password reset requests
func (ah *AuthHandler) ForgotPassword(c *gin.Context) {
	auth_handler_modules.ForgotPassword(ah.db, ah.emailService, c)
}

// ResetPassword handles password reset with token
func (ah *AuthHandler) ResetPassword(c *gin.Context) {
	auth_handler_modules.ResetPassword(ah.db, c)
}

// ChangePassword handles password change for authenticated users
func (ah *AuthHandler) ChangePassword(c *gin.Context) {
	auth_handler_modules.ChangePassword(ah.db, c)
}

// DeleteAccount handles account deletion for authenticated users
func (ah *AuthHandler) DeleteAccount(c *gin.Context) {
	auth_handler_modules.DeleteAccount(ah.db, c)
}

// GetCurrentUser returns current user info
func (ah *AuthHandler) GetCurrentUser(c *gin.Context) {
	auth_handler_modules.GetCurrentUser(ah.db, c)
}

// ConfirmEmail handles email confirmation
func (ah *AuthHandler) ConfirmEmail(c *gin.Context) {
	auth_handler_modules.ConfirmEmail(ah.db, c)
}

// ResendConfirmationEmail handles resending confirmation emails
func (ah *AuthHandler) ResendConfirmationEmail(c *gin.Context) {
	auth_handler_modules.ResendConfirmationEmail(ah.db, ah.emailService, c)
}