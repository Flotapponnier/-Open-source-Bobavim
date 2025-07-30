package handlers

import (
	"boba-vim/internal/config"
	"boba-vim/internal/models"
	gameService "boba-vim/internal/services/game"
	"boba-vim/internal/version"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"os"
)

type WebHandler struct {
	gameService *gameService.GameService
	cfg         *config.Config
	db          *gorm.DB
}

func NewWebHandler(db *gorm.DB) *WebHandler {
	cfg := config.Load()
	return &WebHandler{
		gameService: gameService.NewGameService(db, cfg, nil),
		cfg:         cfg,
		db:          db,
	}
}

func NewWebHandlerWithPearlMold(db *gorm.DB, pearlMoldService *gameService.PearlMoldService) *WebHandler {
	cfg := config.Load()
	return &WebHandler{
		gameService: gameService.NewGameService(db, cfg, pearlMoldService),
		cfg:         cfg,
		db:          db,
	}
}

// Index serves the main page
func (wh *WebHandler) Index(c *gin.Context) {
	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}
	
	c.HTML(http.StatusOK, "index_go.html", gin.H{
		"title": "Boba.vim - Master Vim Normal Mode Motions Through Speedrun Game",
		"metaDescription": "Master Vim motions and normal mode commands through addictive speedrun challenges. Play solo, compete online, and become a Vim expert with Boba.vim - the ultimate vim learning game.",
		"ogTitle": "Boba.vim - Master Vim Normal Mode Motions",
		"ogDescription": "Learn vim normal mode motions through speedrun challenges. Master hjkl, w/b/e, gg/G and compete with players worldwide!",
		"twitterTitle": "Boba.vim - Master Vim Normal Mode",
		"twitterDescription": "🥤 Learn vim normal mode motions through interactive speedrun challenges! Perfect for mastering hjkl, word jumping, and navigation.",
		"canonicalURL": "https://boba.vim/",
		"ogURL": "https://boba.vim/",
		"stripe_publishable_key": os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		"env": env,
		"frontend_log_level": wh.cfg.FrontendLogLevel,
		"cache_buster": version.GetCacheBuster(),
	})
}

// PlayGame serves the game page using existing session or creates new one
func (wh *WebHandler) PlayGame(c *gin.Context) {
	session := sessions.Default(c)

	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}

	// Check if this is a multiplayer game request
	isMultiplayer := c.Query("multiplayer") == "true"
	matchID := c.Query("match_id")

	if isMultiplayer && matchID != "" {
		// This is a multiplayer game, serve the multiplayer game page
		c.HTML(http.StatusOK, "multiplayer_game_go.html", gin.H{
			"title":        "Boba.vim - Online Multiplayer Vim Normal Mode Battle",
			"metaDescription": "Compete in real-time vim normal mode battles against players worldwide. Test your vim motions in intense multiplayer matches and climb the leaderboard!",
			"ogTitle": "Join Vim Normal Mode Battle - Boba.vim Multiplayer",
			"ogDescription": "Battle other players in real-time vim normal mode challenges. Perfect your motions and prove you're the ultimate vim master!",
			"canonicalURL": "https://boba.vim/multiplayer",
			"is_multiplayer": true,
			"match_id":     matchID,
			"env": env,
			"frontend_log_level": wh.cfg.FrontendLogLevel,
			"cache_buster": version.GetCacheBuster(),
		})
		return
	}

	// Single-player game logic
	// Security check: Prevent direct access to /play without proper game session
	// Check if there's an existing game session token
	sessionToken := session.Get("game_session_token")

	var result map[string]interface{}
	var err error

	if sessionToken != nil {
		// Try to get existing game state
		result, err = wh.gameService.GetGameState(sessionToken.(string))
		if err == nil && result["success"].(bool) {
			// Check if the game is completed - don't render completed games
			if isCompleted, ok := result["is_completed"].(bool); ok && isCompleted {
				// Game is completed, clear session and redirect to home
				session.Delete("game_session_token")
				session.Save()
				c.Redirect(http.StatusFound, "/")
				return
			}
			
			// Get character level if user is logged in
			var characterLevel interface{} = nil
			userID := session.Get("user_id")
			if userID != nil && result["selected_character"] != nil {
				selectedCharacter := result["selected_character"].(string)
				var ownership models.PlayerCharacterOwnership
				err := wh.db.Where("player_id = ? AND character_name = ?", userID, selectedCharacter).First(&ownership).Error
				if err == nil {
					characterLevel = ownership.Level
				}
			}

			// Use existing game state - fields come directly from GetGameState
			c.HTML(http.StatusOK, "game_go.html", gin.H{
				"title":              "Boba.vim - Practice Vim Normal Mode Motions Solo",
				"metaDescription":    "Practice vim normal mode motions in solo mode. Master hjkl navigation, word jumping, and line movement through interactive gameplay challenges.",
				"ogTitle":            "Master Vim Normal Mode Solo - Boba.vim Practice",
				"ogDescription":      "Perfect your vim normal mode skills in solo practice mode. Learn motions and commands at your own pace with instant feedback!",
				"canonicalURL":       "https://boba.vim/game",
				"text_grid":          result["text_grid"],
				"game_map":           result["game_map"],
				"score":              result["score"],
				"selected_character": result["selected_character"],
				"character_level":    characterLevel,
				"env": env,
				"frontend_log_level": wh.cfg.FrontendLogLevel,
				"cache_buster": version.GetCacheBuster(),
			})
			return
		}
	}

	// No existing session or session invalid, redirect to home page to start a new game
	c.Redirect(http.StatusFound, "/")
}

// NotFound serves the 404 page
func (wh *WebHandler) NotFound(c *gin.Context) {
	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}
	
	c.HTML(http.StatusNotFound, "404_go.html", gin.H{
		"title": "Boba.vim - Page Not Found",
		"path":  c.Request.URL.Path,
		"env": env,
		"frontend_log_level": wh.cfg.FrontendLogLevel,
	})
}

// InternalServerError serves the 500 page
func (wh *WebHandler) InternalServerError(c *gin.Context) {
	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}
	
	c.HTML(http.StatusInternalServerError, "500_go.html", gin.H{
		"title": "Boba.vim - Internal Server Error",
		"error": "An unexpected error occurred. Please try again later.",
		"env": env,
		"frontend_log_level": wh.cfg.FrontendLogLevel,
	})
}

// ResetPassword serves the password reset page
func (wh *WebHandler) ResetPassword(c *gin.Context) {
	token := c.Query("token")
	
	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}
	
	if token == "" {
		c.HTML(http.StatusBadRequest, "reset_password_go.html", gin.H{
			"title": "Boba.vim - Reset Password",
			"Error": "Invalid or missing reset token",
			"env": env,
			"frontend_log_level": wh.cfg.FrontendLogLevel,
		})
		return
	}
	
	// Verify token exists and is valid
	var player models.Player
	if err := wh.db.Where("reset_token = ?", token).First(&player).Error; err != nil {
		c.HTML(http.StatusNotFound, "reset_password_go.html", gin.H{
			"title": "Boba.vim - Reset Password",
			"Error": "Invalid or expired reset token",
			"env": env,
			"frontend_log_level": wh.cfg.FrontendLogLevel,
		})
		return
	}
	
	// Check if token is expired
	if !player.IsResetTokenValid(token) {
		c.HTML(http.StatusGone, "reset_password_go.html", gin.H{
			"title": "Boba.vim - Reset Password",
			"Error": "Reset token has expired. Please request a new password reset.",
			"env": env,
			"frontend_log_level": wh.cfg.FrontendLogLevel,
		})
		return
	}
	
	// Token is valid, show reset form
	c.HTML(http.StatusOK, "reset_password_go.html", gin.H{
		"title": "Boba.vim - Reset Password",
		"Token": token,
		"env": env,
		"frontend_log_level": wh.cfg.FrontendLogLevel,
	})
}

// AdminPanel serves the admin panel page with authentication
func (wh *WebHandler) AdminPanel(c *gin.Context) {
	session := sessions.Default(c)
	adminID := session.Get("admin_id")
	adminToken := session.Get("admin_token")

	env := "development"
	if !wh.cfg.IsDevelopment {
		env = "production"
	}

	// Check if admin is authenticated
	if adminID != nil && adminToken != nil {
		// Verify admin session is valid
		var admin models.Admin
		if err := wh.db.Where("id = ? AND session_token = ? AND is_active = ?", adminID, adminToken, true).First(&admin).Error; err == nil {
			// Check if session is still valid
			if admin.IsSessionValid() {
				// Admin is authenticated, show admin panel
				c.HTML(http.StatusOK, "admin.html", gin.H{
					"title":         "Boba.vim - Admin Panel",
					"authenticated": true,
					"admin_username": admin.Username,
					"env": env,
					"frontend_log_level": wh.cfg.FrontendLogLevel,
				})
				return
			}
		}
	}

	// Not authenticated, show login form
	c.HTML(http.StatusOK, "admin.html", gin.H{
		"title":         "Boba.vim - Admin Login",
		"authenticated": false,
		"env": env,
		"frontend_log_level": wh.cfg.FrontendLogLevel,
	})
}
