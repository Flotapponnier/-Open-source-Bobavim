package database

import (
	"boba-vim/internal/cache"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Initialize(databaseURL string) (*gorm.DB, error) {
	var db *gorm.DB
	var err error
	
	// Check if it's a PostgreSQL connection string
	if strings.HasPrefix(databaseURL, "postgres://") || strings.HasPrefix(databaseURL, "postgresql://") {
		db, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	} else {
		// Use SQLite for local development
		db, err = gorm.Open(sqlite.Open(databaseURL), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	}
	
	if err != nil {
		return nil, err
	}

	// Configure database connection pooling for high-concurrency scenarios
	if err := configureConnectionPooling(db, databaseURL); err != nil {
		return nil, err
	}

	// Initialize Redis cache for high-performance caching
	cache.InitializeRedis()

	// Check if database reset is requested
	if os.Getenv("RESET_DATABASE") == "true" {
		utils.Info("RESET_DATABASE=true detected, dropping all tables...")
		
		// Drop all tables
		err = db.Migrator().DropTable(
			&models.Player{},
			&models.GameSession{},
			&models.UserFavorite{},
			&models.PlayerBestScore{},
			&models.MapCompletion{},
			&models.CharacterPayment{},
			&models.PlayerCharacterOwnership{},
			&models.MatchmakingQueue{},
			&models.OnlineMatch{},
			&models.MultiplayerGameResult{},
			&models.MultiplayerPlayerStats{},
			&models.Survey{},
			&models.SurveyQuestion{},
			&models.SurveyVote{},
			&models.Newsletter{},
			&models.NewsletterRead{},
			&models.Admin{},
		)
		if err != nil {
			utils.Error("Warning: Failed to drop some tables: %v", err)
		}
		
		utils.Info("Database reset completed!")
	}

	// Auto-migrate the schema
	err = db.AutoMigrate(
		&models.Player{},
		&models.GameSession{},
		&models.UserFavorite{},
		&models.PlayerBestScore{},
		&models.MapCompletion{},
		&models.CharacterPayment{},
		&models.PlayerCharacterOwnership{},
		&models.MatchmakingQueue{},
		&models.OnlineMatch{},
		&models.MultiplayerGameResult{},
		&models.MultiplayerPlayerStats{},
		&models.Survey{},
		&models.SurveyQuestion{},
		&models.SurveyVote{},
		&models.Newsletter{},
		&models.NewsletterRead{},
		&models.Admin{},
	)
	if err != nil {
		return nil, err
	}

	// Seed initial survey data
	if err := seedSurveyData(db); err != nil {
		return nil, err
	}

	// Seed admin account
	if err := seedAdminData(db); err != nil {
		return nil, err
	}

	// Seed newsletter data
	if err := seedNewsletterData(db); err != nil {
		return nil, err
	}

	// Add performance-critical database indexes
	if err := addPerformanceIndexes(db, databaseURL); err != nil {
		utils.Error("Warning: Failed to add some performance indexes: %v", err)
	}

	return db, nil
}

func seedSurveyData(db *gorm.DB) error {
	// Check if survey already exists
	var count int64
	db.Model(&models.Survey{}).Count(&count)
	
	if count > 0 {
		// Survey data already exists
		return nil
	}
	
	// Create the initial survey
	survey := models.Survey{
		Title:       "Game Feedback",
		Description: "Help us improve Boba.vim by rating your experience!",
		IsActive:    true,
	}
	
	if err := db.Create(&survey).Error; err != nil {
		return err
	}
	
	// Create the rating question
	question := models.SurveyQuestion{
		SurveyID:     survey.ID,
		QuestionText: "How would you rate Boba.vim overall?",
		QuestionType: "rating",
		MinValue:     func() *int { v := 1; return &v }(),
		MaxValue:     func() *int { v := 10; return &v }(),
		IsRequired:   true,
		SortOrder:    1,
	}
	
	if err := db.Create(&question).Error; err != nil {
		return err
	}
	
	return nil
}

func seedAdminData(db *gorm.DB) error {
	// Check if admin already exists
	var count int64
	db.Model(&models.Admin{}).Count(&count)
	
	if count > 0 {
		// Admin account already exists
		return nil
	}
	
	// Create the default admin account using environment variables
	adminUsername := os.Getenv("ADMIN_USERNAME")
	if adminUsername == "" {
		adminUsername = "test"
	}
	
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "test"
	}
	
	admin := models.Admin{
		Username: adminUsername,
		IsActive: true,
	}
	
	// Set the secure password
	if err := admin.SetPassword(adminPassword); err != nil {
		return err
	}
	
	if err := db.Create(&admin).Error; err != nil {
		return err
	}
	
	return nil
}

func seedNewsletterData(db *gorm.DB) error {
	// Check if newsletter already exists
	var count int64
	db.Model(&models.Newsletter{}).Count(&count)
	
	if count > 0 {
		// Newsletter data already exists
		return nil
	}
	
	// Create the initial newsletter post
	newsletter := models.Newsletter{
		Title:   "Message from Boba Boss",
		Content: `<p><strong>Hello, world!</strong></p>

<p>
  Boba.vim is officially opening its doors!<br />
  This game is made for everyone curious about Vim.<br />
  The goal? To make Vim motions fun, interactive, and gamified.
</p>

<p>
  This is just the beginning.<br />
  Boba.vim has many features and game mechanics coming soon.<br />
  You'll regularly see polls to help guide its evolution.<br />
  Your opinion truly matters.
</p>

<p>
  Boba.vim aims to grow into a vibrant game that attracts all kinds of
  players.<br />
  It will evolve alongside its community, striving to become the
  ultimate Boba Vim experience.
</p>

<p><strong>I want to expand the game in 3 directions:</strong></p>

<p>
  <em>Attract beginners with no programming experience</em><br />
  Spark curiosity and introduce them to programming through play. Make vim experience easily attainable for beginner.
</p>

<p>
  <em>Make it competitive and challenging</em><br />
  Offer original game modes that showcase all Vim motions in creative
  and impressive ways. Develop tournament and maybe see the first e-sport vim tournament in the future ?
</p>

<p>
  <em>Keep it fun and educational</em><br />
  A perfect blend of learning and entertainment. Make vim fun and understanding the magic behind it trough playing.
</p>

<p>
  <strong>Support the game ❤️</strong><br />
  You can support Boba.vim with a donation of just $1 and unlock a
  symbolic Boba Diamond Caracter.<br />
  The more you give, the more your Boba Diamond will level up!<br />
  Every cent will be reinvested into developing these 3 game directions
  and satisfying the community's needs. We want to preserve and carry forward the incredible work and vision that Bram Moolenaar brought to the world, by making the Vim experience more accessible to developers."
</p>

<p>
  <strong>Supporters will:</strong><br />
  • Be featured on the Thank You Board<br />
  • Get closer access to the community<br />
  • Receive early or exclusive features
</p>

<p>
  <strong>Special thanks</strong><br />
  A big shoutout to the amazing people at 42 Heilbronn<br />
  for their valuable feedback and support during development.<br />
  Your help was crucial to making this game a reality. A big thanks for
  my Taiwanese partner, where all the inspiration come from.
</p>

<p><em>Make Boba great again. Make Vim great again.</em></p>

<p><strong>Boba Boss</strong></p>`,
		Summary: "Welcome to Boba.vim! A message from Boss Boba about the game's official launch and future directions.",
		IsActive: true,
	}
	
	if err := db.Create(&newsletter).Error; err != nil {
		return err
	}
	
	return nil
}

// addPerformanceIndexes adds critical database indexes for high-performance scenarios
func addPerformanceIndexes(db *gorm.DB, databaseURL string) error {
	// Skip index creation for SQLite (different syntax and less critical for dev)
	if !strings.HasPrefix(databaseURL, "postgres://") && !strings.HasPrefix(databaseURL, "postgresql://") {
		return nil
	}
	
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	
	// Critical composite indexes for multiplayer performance
	indexes := []string{
		// Game sessions - frequently queried by active status and player
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_active_player ON game_sessions(is_active, player_id) WHERE is_active = true",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_multiplayer_game ON game_sessions(multiplayer_game_id) WHERE is_multiplayer = true",
		
		// Multiplayer game results - critical for leaderboard queries
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multiplayer_results_players ON multiplayer_game_results(player1_id, player2_id, completed_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multiplayer_results_winner ON multiplayer_game_results(winner_id, completed_at DESC) WHERE winner_id IS NOT NULL",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multiplayer_results_completion ON multiplayer_game_results(completed_at DESC, completion_type)",
		
		// Player statistics - optimized for leaderboard sorting
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multiplayer_stats_leaderboard ON multiplayer_player_stats(total_games_played DESC, win_rate DESC, average_score DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multiplayer_stats_active ON multiplayer_player_stats(last_played_at DESC) WHERE last_played_at IS NOT NULL",
		
		// Matchmaking queue - frequently accessed for finding matches
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_time ON matchmaking_queue(queued_at ASC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchmaking_queue_player_time ON matchmaking_queue(player_id, queued_at DESC)",
		
		// Online matches - for active match management
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_online_matches_players ON online_matches(player1_id, player2_id, matched_at DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_online_matches_acknowledgment ON online_matches(player1_acknowledged, player2_acknowledged, matched_at DESC)",
		
		// Player best scores - frequently accessed for rankings
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_best_scores_map ON player_best_scores(map_id, best_score DESC)",
		"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_best_scores_player_map ON player_best_scores(player_id, map_id)",
	}
	
	utils.Info("Adding performance-critical database indexes...")
	for _, indexSQL := range indexes {
		if _, err := sqlDB.Exec(indexSQL); err != nil {
			utils.Error("Failed to create index: %s - Error: %v", indexSQL, err)
			// Continue with other indexes even if one fails
		}
	}
	
	utils.Info("Database performance indexes setup completed")
	return nil
}

// configureConnectionPooling sets up database connection pooling for high-concurrency scenarios
func configureConnectionPooling(db *gorm.DB, databaseURL string) error {
	// Skip pooling configuration for SQLite as it doesn't support multiple connections
	if !strings.HasPrefix(databaseURL, "postgres://") && !strings.HasPrefix(databaseURL, "postgresql://") {
		return nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	// Connection pool settings optimized for 10,000+ concurrent players
	// Maximum number of open connections to the database
	sqlDB.SetMaxOpenConns(1000)
	
	// Maximum number of idle connections in the pool
	sqlDB.SetMaxIdleConns(200)
	
	// Maximum lifetime of a connection (prevents stale connections)
	sqlDB.SetConnMaxLifetime(2 * time.Hour)
	
	// Maximum time a connection can be idle before being closed
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	utils.Info("Database connection pooling configured:")
	utils.Info("  - Max Open Connections: %d", 1000)
	utils.Info("  - Max Idle Connections: %d", 200)
	utils.Info("  - Connection Max Lifetime: %v", 2*time.Hour)
	utils.Info("  - Connection Max Idle Time: %v", 15*time.Minute)

	return nil
}
