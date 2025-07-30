package cleanup

import (
	"time"

	"boba-vim/internal/config"
	"boba-vim/internal/models"
	gameService "boba-vim/internal/services/game"
	"boba-vim/internal/utils"

	"gorm.io/gorm"
)

// CleanupService handles periodic cleanup of expired games
type CleanupService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewCleanupService creates a new cleanup service
func NewCleanupService(db *gorm.DB, cfg *config.Config) *CleanupService {
	return &CleanupService{
		db:  db,
		cfg: cfg,
	}
}

// StartPeriodicCleanup starts a goroutine that periodically cleans up expired games
func (cs *CleanupService) StartPeriodicCleanup() {
	ticker := time.NewTicker(5 * time.Minute) // Check every 5 minutes
	
	go func() {
		for range ticker.C {
			cs.CleanupExpiredGames()
		}
	}()
	
	utils.Info("Started periodic game cleanup service")
}

// CleanupExpiredGames finds and expires all games that have exceeded the time limit
func (cs *CleanupService) CleanupExpiredGames() {
	sessionService := gameService.NewSessionService(cs.db, cs.cfg)
	
	// Find all active games
	var activeSessions []models.GameSession
	if err := cs.db.Where("is_active = ?", true).Find(&activeSessions).Error; err != nil {
		utils.Error("Error finding active sessions for cleanup: %v", err)
		return
	}
	
	expiredCount := 0
	for _, session := range activeSessions {
		if sessionService.IsGameExpired(&session) {
			sessionService.ExpireGame(&session)
			expiredCount++
		}
	}
	
	if expiredCount > 0 {
		utils.Info("Cleaned up %d expired game sessions", expiredCount)
	}
}