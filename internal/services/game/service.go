package game

import (
	"boba-vim/internal/config"
	"gorm.io/gorm"
)

// GameService is the main service that orchestrates all game-related operations
type GameService struct {
	Session     *SessionService
	Movement    *MovementService
	Leaderboard *LeaderboardService
	db          *gorm.DB
}

// NewGameService creates a new game service with all sub-services
func NewGameService(db *gorm.DB, cfg *config.Config, pearlMoldService *PearlMoldService) *GameService {
	return &GameService{
		Session:     NewSessionService(db, cfg),
		Movement:    NewMovementService(db, cfg, pearlMoldService),
		Leaderboard: NewLeaderboardService(db, cfg),
		db:          db,
	}
}

// ProcessMove processes a move with full concurrency control
func (gs *GameService) ProcessMove(sessionToken, direction string, count int, hasExplicitCount bool) (map[string]interface{}, error) {
	return gs.Movement.ProcessMove(sessionToken, direction, count, hasExplicitCount)
}

// GetGameState returns current game state
func (gs *GameService) GetGameState(sessionToken string) (map[string]interface{}, error) {
	return gs.Session.GetGameState(sessionToken)
}

// GetLeaderboard returns leaderboard data
func (gs *GameService) GetLeaderboard(boardType string, limit int) (map[string]interface{}, error) {
	return gs.Leaderboard.GetLeaderboard(boardType, limit)
}

// GetLeaderboardByMap returns leaderboard data for a specific map
func (gs *GameService) GetLeaderboardByMap(boardType string, limit int, mapID int) (map[string]interface{}, error) {
	return gs.Leaderboard.GetLeaderboardByMap(boardType, limit, mapID)
}

// StartGameWithMap starts a new game with a specific map
func (gs *GameService) StartGameWithMap(username interface{}, selectedCharacter string, mapID int) (map[string]interface{}, error) {
	return gs.Session.StartGameWithMap(username, selectedCharacter, mapID)
}

// NewMultiplayerLeaderboardService creates a new multiplayer leaderboard service
func (gs *GameService) NewMultiplayerLeaderboardService() *MultiplayerLeaderboardService {
	return NewMultiplayerLeaderboardService(gs.db)
}
