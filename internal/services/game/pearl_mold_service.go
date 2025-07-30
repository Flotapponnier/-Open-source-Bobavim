package game

import (
	"log"
	"sync"
	"time"

	"boba-vim/internal/config"
	"boba-vim/internal/constant"
	"boba-vim/internal/game"
	"boba-vim/internal/models"

	"gorm.io/gorm"
)

type PearlMoldService struct {
	db  *gorm.DB
	cfg *config.Config
	lastMovementTime map[string]time.Time // Track last movement time per session
	movementMutex    sync.RWMutex          // Protect the movement time map
}

func NewPearlMoldService(db *gorm.DB, cfg *config.Config) *PearlMoldService {
	return &PearlMoldService{
		db:               db,
		cfg:              cfg,
		lastMovementTime: make(map[string]time.Time),
	}
}

func (pms *PearlMoldService) StartPeriodicMovement() {
	ticker := time.NewTicker(2 * time.Second) // Move every 2 seconds
	cleanupTicker := time.NewTicker(1 * time.Minute) // Cleanup every minute
	
	go func() {
		for {
			select {
			case <-ticker.C:
				pms.MoveAllPearlMolds()
			case <-cleanupTicker.C:
				pms.CleanupOldMovementTimes()
			}
		}
	}()
	
	log.Println("Started pearl mold movement service (every 2 seconds with cleanup)")
}

func (pms *PearlMoldService) MoveAllPearlMolds() {
	var activeSessions []models.GameSession
	if err := pms.db.Where("is_active = ? AND is_multiplayer = ?", true, false).Find(&activeSessions).Error; err != nil {
		log.Printf("Error finding active sessions for pearl mold movement: %v", err)
		return
	}
	
	for _, session := range activeSessions {
		// Only move pearl molds in hard difficulty maps and single-player games
		gameMapData := constant.GetMapByID(session.MapID)
		if gameMapData == nil || gameMapData.Difficulty != "hard" {
			continue
		}
		
		gameMap := session.GetGameMap()
		if gameMap != nil && game.MovePearlMoldRandomly(gameMap) {
			// Track the movement time for this session
			pms.movementMutex.Lock()
			pms.lastMovementTime[session.SessionToken] = time.Now()
			pms.movementMutex.Unlock()
			
			session.SetGameMap(gameMap)
			if err := pms.db.Save(&session).Error; err != nil {
				log.Printf("Error saving session after pearl mold movement: %v", err)
			}
			
			log.Printf("Pearl mold moved for session %s", session.SessionToken)
		}
	}
}

// HasRecentMoldMovement checks if pearl mold moved recently for a session
// Returns true if mold moved within the last 200ms (grace period for visual sync)
func (pms *PearlMoldService) HasRecentMoldMovement(sessionToken string) bool {
	pms.movementMutex.RLock()
	defer pms.movementMutex.RUnlock()
	
	lastMoveTime, exists := pms.lastMovementTime[sessionToken]
	if !exists {
		return false
	}
	
	// Check if movement happened within the last 200ms
	return time.Since(lastMoveTime) < 200*time.Millisecond
}

// CleanupOldMovementTimes removes old movement times to prevent memory leaks
func (pms *PearlMoldService) CleanupOldMovementTimes() {
	pms.movementMutex.Lock()
	defer pms.movementMutex.Unlock()
	
	cutoff := time.Now().Add(-5 * time.Minute) // Remove entries older than 5 minutes
	for sessionToken, moveTime := range pms.lastMovementTime {
		if moveTime.Before(cutoff) {
			delete(pms.lastMovementTime, sessionToken)
		}
	}
}