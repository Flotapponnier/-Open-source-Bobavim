package game

import (
	"boba-vim/internal/models"
	"gorm.io/gorm"
)

// PlayerBestScoreService handles operations related to player best scores
type PlayerBestScoreService struct {
	db *gorm.DB
}

// NewPlayerBestScoreService creates a new PlayerBestScoreService
func NewPlayerBestScoreService(db *gorm.DB) *PlayerBestScoreService {
	return &PlayerBestScoreService{db: db}
}

// UpsertPlayerBestScore creates or updates a player's best score for a map
func (s *PlayerBestScoreService) UpsertPlayerBestScore(playerID uint, mapID int, gameSession *models.GameSession) error {
	if gameSession.CompletionTime == nil || gameSession.FinalScore == nil {
		return nil // Don't save incomplete games
	}

	// Get character level for boba_diamond
	characterLevel := s.getCharacterLevel(playerID, gameSession.SelectedCharacter)

	// Check if player already has a best score for this map
	var existingScore models.PlayerBestScore
	err := s.db.Where("player_id = ? AND map_id = ?", playerID, mapID).First(&existingScore).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	// If no existing score, create new one
	if err == gorm.ErrRecordNotFound {
		newScore := models.PlayerBestScore{
			PlayerID:          playerID,
			MapID:             mapID,
			BestScore:         *gameSession.FinalScore,
			FastestTime:       *gameSession.CompletionTime,
			TotalMoves:        gameSession.TotalMoves,
			PearlsCollected:   gameSession.PearlsCollected,
			SelectedCharacter: gameSession.SelectedCharacter,
			CharacterLevel:    characterLevel,
		}
		return s.db.Create(&newScore).Error
	}

	// If existing score exists, update only if this completion is faster
	if *gameSession.CompletionTime < existingScore.FastestTime {
		existingScore.BestScore = *gameSession.FinalScore
		existingScore.FastestTime = *gameSession.CompletionTime
		existingScore.TotalMoves = gameSession.TotalMoves
		existingScore.PearlsCollected = gameSession.PearlsCollected
		existingScore.SelectedCharacter = gameSession.SelectedCharacter
		existingScore.CharacterLevel = characterLevel
		existingScore.CompletedAt = gameSession.UpdatedAt

		return s.db.Save(&existingScore).Error
	}

	return nil // No update needed - existing score is better
}

// GetPlayerBestScores returns all best scores for a player
func (s *PlayerBestScoreService) GetPlayerBestScores(playerID uint) ([]models.PlayerBestScore, error) {
	var scores []models.PlayerBestScore
	err := s.db.Where("player_id = ?", playerID).Find(&scores).Error
	return scores, err
}

// GetPlayerBestScoreForMap returns a player's best score for a specific map
func (s *PlayerBestScoreService) GetPlayerBestScoreForMap(playerID uint, mapID int) (*models.PlayerBestScore, error) {
	var score models.PlayerBestScore
	err := s.db.Preload("Player").Where("player_id = ? AND map_id = ?", playerID, mapID).First(&score).Error
	if err != nil {
		return nil, err
	}
	return &score, nil
}

// GetLeaderboardForMap returns the leaderboard for a specific map using best scores
func (s *PlayerBestScoreService) GetLeaderboardForMap(mapID int, limit int) ([]models.PlayerBestScore, error) {
	var scores []models.PlayerBestScore
	err := s.db.Preload("Player").
		Joins("JOIN players ON players.id = player_best_scores.player_id").
		Where("player_best_scores.map_id = ? AND players.email_confirmed = ?", mapID, true).
		Order("player_best_scores.fastest_time ASC, player_best_scores.total_moves ASC").
		Limit(limit).
		Find(&scores).Error
	return scores, err
}

// GetOverallLeaderboard returns the overall leaderboard (best times across all maps)
func (s *PlayerBestScoreService) GetOverallLeaderboard(limit int) ([]models.PlayerBestScore, error) {
	var scores []models.PlayerBestScore
	
	// Get each player's best overall time using a subquery
	// First, find the minimum fastest_time for each confirmed player
	subquery := s.db.Table("player_best_scores pbs").
		Select("pbs.player_id, MIN(pbs.fastest_time) as min_time").
		Joins("JOIN players p ON p.id = pbs.player_id").
		Where("p.email_confirmed = ?", true).
		Group("pbs.player_id")
	
	// Then get the actual records with those minimum times
	err := s.db.Preload("Player").
		Joins("JOIN players ON players.id = player_best_scores.player_id").
		Joins("JOIN (?) as best_times ON best_times.player_id = player_best_scores.player_id AND best_times.min_time = player_best_scores.fastest_time", subquery).
		Where("players.email_confirmed = ?", true).
		Order("player_best_scores.fastest_time ASC, player_best_scores.total_moves ASC").
		Limit(limit).
		Find(&scores).Error
	
	return scores, err
}

// GetPlayerPositionForMap returns a player's position in the leaderboard for a specific map
func (s *PlayerBestScoreService) GetPlayerPositionForMap(playerID uint, mapID int) (*LeaderboardPosition, error) {
	// Get player's best score for this map
	playerScore, err := s.GetPlayerBestScoreForMap(playerID, mapID)
	if err != nil {
		// Propagate the error (including gorm.ErrRecordNotFound)
		return nil, err
	}

	// Count how many players have better times (or same time with fewer moves)
	var betterCount int64
	err = s.db.Model(&models.PlayerBestScore{}).
		Joins("JOIN players ON players.id = player_best_scores.player_id").
		Where("player_best_scores.map_id = ? AND players.email_confirmed = ? AND (player_best_scores.fastest_time < ? OR (player_best_scores.fastest_time = ? AND player_best_scores.total_moves < ?))",
			mapID, true, playerScore.FastestTime, playerScore.FastestTime, playerScore.TotalMoves).
		Count(&betterCount).Error
	if err != nil {
		return nil, err
	}

	// Get total players for this map
	var totalPlayers int64
	err = s.db.Model(&models.PlayerBestScore{}).
		Joins("JOIN players ON players.id = player_best_scores.player_id").
		Where("player_best_scores.map_id = ? AND players.email_confirmed = ?", mapID, true).
		Count(&totalPlayers).Error
	if err != nil {
		return nil, err
	}

	return &LeaderboardPosition{
		Rank:              int(betterCount) + 1,
		TotalPlayers:      int(totalPlayers),
		Username:          playerScore.Player.Username,
		CompletionTime:    playerScore.FastestTime,
		Score:             playerScore.BestScore,
		TotalMoves:        playerScore.TotalMoves,
		SelectedCharacter: playerScore.SelectedCharacter,
		CharacterLevel:    playerScore.CharacterLevel,
	}, nil
}

// GetPlayerOverallPosition returns a player's best overall position across all maps
func (s *PlayerBestScoreService) GetPlayerOverallPosition(playerID uint) (*LeaderboardPosition, error) {
	// Get player's best time across all maps
	var playerBestScore models.PlayerBestScore
	err := s.db.Preload("Player").
		Where("player_id = ?", playerID).
		Order("fastest_time ASC").
		First(&playerBestScore).Error
	if err != nil {
		return nil, err
	}

	// Count how many players have a better overall best time
	// We need to count players whose best time (minimum fastest_time) is better than this player's best time
	var betterCount int64
	err = s.db.Raw(`
		SELECT COUNT(DISTINCT pbs.player_id)
		FROM player_best_scores pbs
		JOIN players p ON p.id = pbs.player_id
		WHERE p.email_confirmed = true
		  AND pbs.player_id != ?
		  AND (
		    SELECT MIN(pbs2.fastest_time) 
		    FROM player_best_scores pbs2 
		    WHERE pbs2.player_id = pbs.player_id
		  ) < ?
	`, playerID, playerBestScore.FastestTime).Scan(&betterCount).Error
	if err != nil {
		return nil, err
	}

	// Count players with the same best time but fewer moves
	var sameFasterCount int64
	err = s.db.Raw(`
		SELECT COUNT(DISTINCT pbs.player_id)
		FROM player_best_scores pbs
		JOIN players p ON p.id = pbs.player_id
		WHERE p.email_confirmed = true
		  AND pbs.player_id != ?
		  AND (
		    SELECT MIN(pbs2.fastest_time) 
		    FROM player_best_scores pbs2 
		    WHERE pbs2.player_id = pbs.player_id
		  ) = ?
		  AND (
		    SELECT MIN(pbs2.total_moves) 
		    FROM player_best_scores pbs2 
		    WHERE pbs2.player_id = pbs.player_id 
		      AND pbs2.fastest_time = ?
		  ) < ?
	`, playerID, playerBestScore.FastestTime, playerBestScore.FastestTime, playerBestScore.TotalMoves).Scan(&sameFasterCount).Error
	if err != nil {
		return nil, err
	}

	// Get total players with confirmed emails who have completed at least one map
	var totalPlayers int64
	err = s.db.Model(&models.PlayerBestScore{}).
		Joins("JOIN players ON players.id = player_best_scores.player_id").
		Where("players.email_confirmed = ?", true).
		Select("DISTINCT player_best_scores.player_id").
		Count(&totalPlayers).Error
	if err != nil {
		return nil, err
	}

	return &LeaderboardPosition{
		Rank:              int(betterCount + sameFasterCount) + 1,
		TotalPlayers:      int(totalPlayers),
		Username:          playerBestScore.Player.Username,
		CompletionTime:    playerBestScore.FastestTime,
		Score:             playerBestScore.BestScore,
		TotalMoves:        playerBestScore.TotalMoves,
		SelectedCharacter: playerBestScore.SelectedCharacter,
		CharacterLevel:    playerBestScore.CharacterLevel,
	}, nil
}

// getCharacterLevel retrieves the character level for a player
func (s *PlayerBestScoreService) getCharacterLevel(playerID uint, character string) *int {
	// Only boba_diamond has levels
	if character != "boba_diamond" {
		return nil
	}
	
	var ownership models.PlayerCharacterOwnership
	err := s.db.Where("player_id = ? AND character_name = ?", playerID, character).First(&ownership).Error
	if err != nil {
		return nil
	}
	
	return &ownership.Level
}
