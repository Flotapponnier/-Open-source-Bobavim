package main
   
import (
	"boba-vim/internal/config"
	"boba-vim/internal/database"
	"boba-vim/internal/handlers"
	"boba-vim/internal/middleware"
	"boba-vim/internal/services"
	"boba-vim/internal/services/cleanup"
	"boba-vim/internal/services/email"
	"boba-vim/internal/services/game"
	"boba-vim/internal/signal"
	"boba-vim/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"html/template"
	"net/http"
	"strings"
)

func main() {
	// Optimize memory settings for high-performance gaming
	utils.OptimizeMemorySettings()
	utils.ConfigureForMultiplayer()
	
	// Start periodic memory cleanup
	utils.PeriodicMemoryCleanup()
	
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		utils.Debug("Warning: .env file not found or couldn't be loaded: %v", err)
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		utils.Fatal("Failed to initialize database: %v", err)
	}

	// Initialize Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Sessions(cfg.SessionSecret))
	router.Use(middleware.Logger())
	router.Use(middleware.ErrorHandler()) // Add error handling middleware
	
	// Add Gzip compression for better performance
	if !cfg.IsDevelopment {
		router.Use(func(c *gin.Context) {
			// Enable compression for text-based content
			c.Header("Vary", "Accept-Encoding")
			if shouldCompress(c.Request.Header.Get("Accept-Encoding"), c.Request.URL.Path) {
				c.Header("Content-Encoding", "gzip")
			}
			c.Next()
		})
	}

	// Serve static files
	if cfg.IsDevelopment {
		// In development mode, disable caching for static files
		router.Use(func(c *gin.Context) {
			if len(c.Request.URL.Path) > 7 && c.Request.URL.Path[:8] == "/static/" {
				c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
				c.Header("Pragma", "no-cache")
				c.Header("Expires", "0")
			}
			c.Next()
		})
	}
	router.Static("/static", "./static")
	// Load all templates including partials
	tmpl := template.Must(template.ParseGlob("templates/*_go.html"))
	tmpl = template.Must(tmpl.ParseGlob("templates/partials/*_go.html"))
	tmpl = template.Must(tmpl.ParseGlob("templates/base_templates_html/*_go.html"))
	tmpl = template.Must(tmpl.ParseGlob("templates/index_templates_html/*_go.html"))
	tmpl = template.Must(tmpl.ParseGlob("templates/game_templates_html/*_go.html"))
	// Load admin template
	tmpl = template.Must(tmpl.ParseGlob("templates/admin.html"))
	router.SetHTMLTemplate(tmpl)

	// Initialize services
	playerService := services.NewPlayerService(db)
	surveyService := services.NewSurveyService(db)
	newsletterService := services.NewNewsletterService(db)
	paymentService := services.NewPaymentService(db)
	emailService := email.NewEmailServiceFromEnv()
	
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, paymentService)
	userDataHandler := handlers.NewUserDataHandler(db)
	surveyHandler := handlers.NewSurveyHandler(db)
	adminHandler := handlers.NewAdminHandler(playerService, surveyService, newsletterService, emailService, db)
	newsletterHandler := handlers.NewNewsletterHandler(newsletterService)
	paymentHandler := handlers.NewPaymentHandler(db, paymentService, emailService)
	
	// Initialize and start cleanup service
	cleanupService := cleanup.NewCleanupService(db, cfg)
	cleanupService.StartPeriodicCleanup()
	
	// Initialize and start pearl mold movement service
	pearlMoldService := game.NewPearlMoldService(db, cfg)
	pearlMoldService.StartPeriodicMovement()
	
	// Initialize game handlers with pearl mold service for collision fix
	gameHandler := handlers.NewGameHandlerWithPearlMold(db, pearlMoldService)
	webHandler := handlers.NewWebHandlerWithPearlMold(db, pearlMoldService)

	// Web routes
	router.GET("/", webHandler.Index)
	router.GET("/play", webHandler.PlayGame)
	router.GET("/reset-password", webHandler.ResetPassword)
	router.GET("/admin/dashboard/secure", webHandler.AdminPanel)


	// API routes
	api := router.Group("/api")
	{
		api.POST("/set-username", gameHandler.SetUsername)
		api.POST("/move", gameHandler.MovePlayer)
		api.GET("/game-state", gameHandler.GetGameState)
		api.GET("/leaderboard", gameHandler.GetLeaderboard)
		api.GET("/supporters", paymentHandler.GetBobaDiamondSupporters)
		api.POST("/playonline", gameHandler.PlayOnline)
		api.GET("/check-matchmaking", gameHandler.CheckMatchmaking)
		api.POST("/cancel-matchmaking", gameHandler.CancelMatchmaking)
		
		// New WebSocket-based matchmaking routes
		matchmaking := api.Group("/matchmaking")
		{
			matchmaking.GET("/ws", gameHandler.HandleMatchmakingWebSocket)
			matchmaking.POST("/queue/join", gameHandler.JoinMatchmakingQueue)
			matchmaking.POST("/queue/leave", gameHandler.LeaveMatchmakingQueue)
			matchmaking.POST("/match/respond", gameHandler.RespondToMatch)
			matchmaking.GET("/status", gameHandler.GetQueueStatus)
		}

		// Multiplayer game routes
		multiplayer := api.Group("/multiplayer")
		{
			multiplayer.GET("/game/:gameID", gameHandler.GetMultiplayerGameState)
			multiplayer.POST("/game/:gameID/move", gameHandler.ProcessMultiplayerMove)
			multiplayer.GET("/game", gameHandler.GetMultiplayerGameByMatchID)
			multiplayer.POST("/disconnect", gameHandler.HandleMultiplayerDisconnect)
			multiplayer.GET("/leaderboard", gameHandler.GetMultiplayerLeaderboard)
			multiplayer.GET("/player-position", gameHandler.GetMultiplayerPlayerPosition)
			multiplayer.GET("/player-stats", gameHandler.GetMultiplayerPlayerStats)
			multiplayer.GET("/recent-games", gameHandler.GetMultiplayerRecentGames)
		}

		// Map routes
		api.GET("/maps", gameHandler.GetMaps)
		api.GET("/leaderboard-by-map", gameHandler.GetLeaderboardByMap)
		api.POST("/start-game", gameHandler.StartGameWithMap)
		api.POST("/quit-game", gameHandler.QuitGame)
		api.POST("/pause-game", gameHandler.PauseGame)
		api.POST("/resume-game", gameHandler.ResumeGame)
		api.POST("/restart-game", gameHandler.RestartGame)
		api.GET("/completed-maps", gameHandler.GetCompletedMaps)
		api.POST("/migrate-guest-progress", gameHandler.MigrateGuestProgress)

		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/change-password", authHandler.ChangePassword)
			auth.DELETE("/delete-account", authHandler.DeleteAccount)
			auth.GET("/me", authHandler.GetCurrentUser)
			auth.GET("/confirm-email", authHandler.ConfirmEmail)
			auth.POST("/resend-confirmation", authHandler.ResendConfirmationEmail)
		}

		// User data routes
		user := api.Group("/user")
		{
			user.GET("/favorites", userDataHandler.GetUserFavorites)
			user.POST("/favorites", userDataHandler.AddToFavorites)
			user.DELETE("/favorites", userDataHandler.RemoveFromFavorites)
			user.POST("/best-time", userDataHandler.UpdateBestTime)
			user.GET("/stats", userDataHandler.GetUserStats)
		}

		// Survey routes
		survey := api.Group("/surveys")
		{
			survey.GET("/", surveyHandler.GetActiveSurveys)
			survey.GET("/:id/results", surveyHandler.GetSurveyResults)
			survey.GET("/:id/votes", surveyHandler.GetUserVotes)
			survey.POST("/vote", surveyHandler.SubmitSurveyVote)
			survey.DELETE("/vote/:questionId", surveyHandler.DeleteSurveyVote)
		}

		// Newsletter routes (public)
		newsletter := api.Group("/newsletters")
		{
			newsletter.GET("/", newsletterHandler.GetNewsletters)
			newsletter.GET("/:id", newsletterHandler.GetNewsletter)
			newsletter.POST("/:id/read", newsletterHandler.MarkNewsletterAsRead)
		}

		// Payment routes
		payment := api.Group("/payment")
		{
			// Protected payment endpoints (require authentication)
			payment.POST("/create-intent", middleware.RequireAuth(), paymentHandler.CreatePaymentIntent)
			payment.POST("/confirm/:payment_id", middleware.RequireAuth(), paymentHandler.ConfirmPayment)
			// Webhook endpoint doesn't need auth as it's called by Stripe
			payment.POST("/webhook", paymentHandler.HandleStripeWebhook)
		}

		// Player routes
		player := api.Group("/player")
		player.Use(middleware.RequireAuth())
		{
			player.GET("/characters", paymentHandler.GetPlayerCharacters)
			player.GET("/payment-history", paymentHandler.GetCharacterPaymentHistory)
		}

		// Admin routes
		admin := api.Group("/admin")
		{
			admin.POST("/login", adminHandler.AdminLogin)
			admin.POST("/logout", adminHandler.AdminLogout)
			admin.GET("/status", adminHandler.CheckAdminStatus)
			
			// Protected admin routes
			protected := admin.Group("")
			protected.Use(adminHandler.RequireAdmin())
			{
				protected.POST("/newsletter", adminHandler.CreateNewsletter)
				protected.GET("/newsletters", adminHandler.GetNewsletters)
				protected.DELETE("/newsletter/:id", adminHandler.DeleteNewsletter)
				protected.POST("/survey", adminHandler.CreateSurvey)
			}
		}

	}

	// WebSocket routes (outside of /api group)
	ws := router.Group("/ws")
	{
		ws.GET("/multiplayer/:gameID", gameHandler.HandleMultiplayerGameWebSocket)
	}

	// SEO and crawling routes
	router.GET("/robots.txt", func(c *gin.Context) {
		c.File("./static/robots.txt")
	})
	router.GET("/sitemap.xml", func(c *gin.Context) {
		c.File("./static/sitemap.xml")
	})

	// 404 handler - must be last route
	router.NoRoute(webHandler.NotFound)

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		utils.Info("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			utils.Fatal("Failed to start server: %v", err)
		}
	}()

	// Wait for shutdown signal and gracefully shutdown
	signal.WaitForShutdown(srv)
	
	// Cleanup services
	gameHandler.Cleanup()
}

// shouldCompress checks if content should be compressed based on accept-encoding and content type
func shouldCompress(acceptEncoding, path string) bool {
	if !strings.Contains(acceptEncoding, "gzip") {
		return false
	}
	
	// Compress text-based content
	if strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".css") || 
	   strings.HasSuffix(path, ".html") || strings.HasSuffix(path, ".json") ||
	   strings.Contains(path, "/api/") {
		return true
	}
	
	return false
}
