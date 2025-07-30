package services

import (
	"boba-vim/internal/models"
	"gorm.io/gorm"
)

type PlayerService struct {
	db *gorm.DB
}

func NewPlayerService(db *gorm.DB) *PlayerService {
	return &PlayerService{db: db}
}

// GetPlayerByID returns a player by their ID
func (ps *PlayerService) GetPlayerByID(id uint) (*models.Player, error) {
	var player models.Player
	err := ps.db.First(&player, id).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

// GetPlayerByUsername returns a player by their username
func (ps *PlayerService) GetPlayerByUsername(username string) (*models.Player, error) {
	var player models.Player
	err := ps.db.Where("username = ?", username).First(&player).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

// GetAllPlayers returns all players
func (ps *PlayerService) GetAllPlayers() ([]models.Player, error) {
	var players []models.Player
	err := ps.db.Find(&players).Error
	return players, err
}

// CreatePlayer creates a new player
func (ps *PlayerService) CreatePlayer(player *models.Player) error {
	return ps.db.Create(player).Error
}

// UpdatePlayer updates an existing player
func (ps *PlayerService) UpdatePlayer(player *models.Player) error {
	return ps.db.Save(player).Error
}

// DeletePlayer deletes a player
func (ps *PlayerService) DeletePlayer(id uint) error {
	return ps.db.Delete(&models.Player{}, id).Error
}

// GetPlayerStats returns player statistics
func (ps *PlayerService) GetPlayerStats(playerID uint) (map[string]interface{}, error) {
	var player models.Player
	if err := ps.db.Preload("Favorites").First(&player, playerID).Error; err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"player_id":        player.ID,
		"username":         player.Username,
		"total_games":      player.TotalGames,
		"completed_games":  player.CompletedGames,
		"best_score":       player.BestScore,
		"total_pearls":     player.TotalPearls,
		"total_moves":      player.TotalMoves,
		"fastest_time":     player.FastestTime,
		"favorites":        player.Favorites,
	}

	return stats, nil
}