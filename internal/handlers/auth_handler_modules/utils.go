package auth_handler_modules

import (
	"strings"
	"net/http"

	"github.com/gin-gonic/gin"
)

// HandleValidationError provides user-friendly error messages for validation errors
func HandleValidationError(c *gin.Context, err error) {
	errorMsg := "Please check your input"
	if strings.Contains(err.Error(), "min") && strings.Contains(err.Error(), "Username") {
		errorMsg = "Username must be at least 3 characters long"
	} else if strings.Contains(err.Error(), "min") && strings.Contains(err.Error(), "Password") {
		errorMsg = "Password must be at least 8 characters long"
	} else if strings.Contains(err.Error(), "min") && strings.Contains(err.Error(), "NewPassword") {
		errorMsg = "New password must be at least 8 characters long"
	} else if strings.Contains(err.Error(), "max") && strings.Contains(err.Error(), "Username") {
		errorMsg = "Username must be less than 20 characters"
	} else if strings.Contains(err.Error(), "email") {
		errorMsg = "Please enter a valid email address"
	} else if strings.Contains(err.Error(), "required") {
		if strings.Contains(err.Error(), "Username") {
			errorMsg = "Username is required"
		} else if strings.Contains(err.Error(), "Password") {
			errorMsg = "Password is required"
		} else if strings.Contains(err.Error(), "CurrentPassword") {
			errorMsg = "Current password is required"
		} else if strings.Contains(err.Error(), "NewPassword") {
			errorMsg = "New password is required"
		} else if strings.Contains(err.Error(), "Token") {
			errorMsg = "Reset token is required"
		} else if strings.Contains(err.Error(), "Email") {
			errorMsg = "Email address is required"
		} else {
			errorMsg = "All fields are required"
		}
	}

	c.JSON(http.StatusBadRequest, gin.H{
		"success": false,
		"error":   errorMsg,
	})
}

// HandleDatabaseError provides user-friendly error messages for database errors
func HandleDatabaseError(c *gin.Context, err error, operation string) {
	errorMsg := "Database operation failed"
	
	if strings.Contains(err.Error(), "UNIQUE constraint failed") {
		if strings.Contains(err.Error(), "username") {
			errorMsg = "Username already exists. Please choose a different one."
		} else if strings.Contains(err.Error(), "email") {
			errorMsg = "Email already registered. Please use a different email or try logging in."
		} else {
			errorMsg = "Username or email already exists"
		}
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	// Default internal server error
	switch operation {
	case "create_account":
		errorMsg = "Failed to create account"
	case "update_password":
		errorMsg = "Failed to update password"
	case "delete_account":
		errorMsg = "Failed to delete account"
	case "save_reset_token":
		errorMsg = "Failed to process password reset request"
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"error":   errorMsg,
	})
}

// CleanEmail trims whitespace and converts to lowercase
func CleanEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

// CleanUsername trims whitespace
func CleanUsername(username string) string {
	return strings.TrimSpace(username)
}