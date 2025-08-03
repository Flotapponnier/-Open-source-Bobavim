package game

import (
	"errors"
	"fmt"
	"math"
	"time"

	"boba-vim/internal/cache"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"
	"gorm.io/gorm"
)

// MultiplayerLeaderboardService handles multiplayer leaderboard operations
type MultiplayerLeaderboardService struct {
	db    *gorm.DB
	cache *cache.RedisCache
}

// NewMultiplayerLeaderboardService creates a new multiplayer leaderboard service
func NewMultiplayerLeaderboardService(db *gorm.DB) *MultiplayerLeaderboardService {
	return &MultiplayerLeaderboardService{
		db:    db,
		cache: cache.GlobalCache,
	}
}

// LeaderboardEntry represents a single entry in the multiplayer leaderboard
type LeaderboardEntry struct {
	PlayerID         uint    `json:"player_id"`
	Username         string  `json:"username"`
	SelectedCharacter string  `json:"selected_character"`
	CharacterLevel   *int    `json:"character_level"`
	TotalGamesPlayed int     `json:"total_games_played"`
	TotalWins        int     `json:"total_wins"`
	TotalLosses      int     `json:"total_losses"`
	WinRate          float64 `json:"win_rate"`
	AverageScore     float64 `json:"average_score"`
	HighestScore     int     `json:"highest_score"`
	LeaderboardScore float64 `json:"leaderboard_score"`
	Rank             int     `json:"rank"`
	IsConfirmed      bool    `json:"is_confirmed"`
}

// RecordGameResult records a multiplayer game result and updates player stats
func (mls *MultiplayerLeaderboardService) RecordGameResult(gameResult *models.MultiplayerGameResult) error {
	return mls.db.Transaction(func(tx *gorm.DB) error {
		// Save the game result
		if err := tx.Create(gameResult).Error; err != nil {
			return fmt.Errorf("failed to save game result: %w", err)
		}

		// Update player 1 stats
		if err := mls.updatePlayerStats(tx, gameResult.Player1ID, gameResult.Player1Username, gameResult.Player1Character, gameResult.Player1CharacterLevel, gameResult.Player1FinalScore, gameResult.WinnerID, gameResult.GameDuration); err != nil {
			return fmt.Errorf("failed to update player 1 stats: %w", err)
		}

		// Update player 2 stats
		if err := mls.updatePlayerStats(tx, gameResult.Player2ID, gameResult.Player2Username, gameResult.Player2Character, gameResult.Player2CharacterLevel, gameResult.Player2FinalScore, gameResult.WinnerID, gameResult.GameDuration); err != nil {
			return fmt.Errorf("failed to update player 2 stats: %w", err)
		}

		return nil
	})
}

// updatePlayerStats updates or creates player statistics
func (mls *MultiplayerLeaderboardService) updatePlayerStats(tx *gorm.DB, playerID uint, username string, character string, characterLevel *int, finalScore int, winnerID *uint, gameDuration int) error {
	var stats models.MultiplayerPlayerStats
	
	// Find existing stats or create new
	result := tx.Where("player_id = ?", playerID).First(&stats)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create new stats record
			stats = models.MultiplayerPlayerStats{
				PlayerID: playerID,
				Username: username,
				SelectedCharacter: character,
				CharacterLevel: characterLevel,
			}
		} else {
			return result.Error
		}
	} else {
		// Update character information (player might have changed character)
		stats.SelectedCharacter = character
		stats.CharacterLevel = characterLevel
	}

	// Update stats
	stats.TotalGamesPlayed++
	stats.TotalScore += finalScore
	stats.TotalGameTimeSeconds += gameDuration
	
	if finalScore > stats.HighestScore {
		stats.HighestScore = finalScore
	}

	// Update win/loss/tie counts
	if winnerID != nil {
		if *winnerID == playerID {
			stats.TotalWins++
		} else {
			stats.TotalLosses++
		}
	} else {
		stats.TotalTies++
	}

	// Calculate derived statistics
	stats.CalculateWinRate()
	stats.CalculateAverageScore()
	stats.CalculateAverageGameTime()
	
	now := time.Now()
	stats.LastPlayedAt = &now

	// Save or update
	return tx.Save(&stats).Error
}

// GetMultiplayerLeaderboard retrieves the multiplayer leaderboard with proper scoring
func (mls *MultiplayerLeaderboardService) GetMultiplayerLeaderboard(limit int, includeUnconfirmed bool) ([]LeaderboardEntry, error) {
	// Try to get from cache first
	cacheKey := fmt.Sprintf("multiplayer_leaderboard_%d_%v", limit, includeUnconfirmed)
	if mls.cache != nil && mls.cache.IsAvailable() {
		var cachedEntries []LeaderboardEntry
		if err := mls.cache.Get(cacheKey, &cachedEntries); err == nil {
			utils.Info("Returning cached leaderboard with %d entries", len(cachedEntries))
			return cachedEntries, nil
		}
	}

	var stats []models.MultiplayerPlayerStats
	
	query := mls.db.Preload("Player").Order("total_games_played DESC, win_rate DESC, average_score DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&stats).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch multiplayer stats: %w", err)
	}

	// Convert to leaderboard entries and calculate composite scores
	entries := make([]LeaderboardEntry, 0, len(stats))
	for _, stat := range stats {
		if stat.TotalGamesPlayed == 0 {
			continue // Skip players with no games
		}

		entry := LeaderboardEntry{
			PlayerID:         stat.PlayerID,
			Username:         stat.Username,
			SelectedCharacter: stat.SelectedCharacter,
			CharacterLevel:   stat.CharacterLevel,
			TotalGamesPlayed: stat.TotalGamesPlayed,
			TotalWins:        stat.TotalWins,
			TotalLosses:      stat.TotalLosses,
			WinRate:          stat.WinRate,
			AverageScore:     stat.AverageScore,
			HighestScore:     stat.HighestScore,
			IsConfirmed:      stat.Player.EmailConfirmed,
		}

		// Calculate composite leaderboard score
		entry.LeaderboardScore = mls.calculateLeaderboardScore(stat)
		
		// Include based on confirmation status
		if includeUnconfirmed || entry.IsConfirmed {
			entries = append(entries, entry)
		}
	}

	// Sort by composite score (descending)
	for i := 0; i < len(entries)-1; i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].LeaderboardScore > entries[i].LeaderboardScore {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// Assign ranks
	for i := range entries {
		entries[i].Rank = i + 1
	}

	// Cache the result for 5 minutes
	if mls.cache != nil && mls.cache.IsAvailable() {
		if err := mls.cache.Set(cacheKey, entries, 5*time.Minute); err != nil {
			utils.Info("Failed to cache leaderboard: %v", err)
		} else {
			utils.Info("Cached leaderboard with %d entries for 5 minutes", len(entries))
		}
	}

	return entries, nil
}

// calculateLeaderboardScore calculates a composite score for leaderboard ranking
// This balances win rate with game volume to prevent low-game-count players from dominating
func (mls *MultiplayerLeaderboardService) calculateLeaderboardScore(stats models.MultiplayerPlayerStats) float64 {
	if stats.TotalGamesPlayed == 0 {
		return 0
	}

	// Base score components
	winRate := stats.WinRate / 100.0 // Convert percentage to decimal
	avgScore := stats.AverageScore / 1300.0 // Normalize to winning score
	
	// Game volume factor - reduces impact of low game counts
	// Uses a logarithmic scale to prevent excessive punishment
	minGames := 5.0
	gameVolumeFactor := math.Min(1.0, math.Log(float64(stats.TotalGamesPlayed)+1)/math.Log(minGames+1))
	
	// Weighted composite score
	// 60% win rate, 30% average score, 10% game volume
	compositeScore := (winRate * 0.6) + (avgScore * 0.3) + (gameVolumeFactor * 0.1)
	
	// Apply game volume dampening to prevent low-game players from ranking too high
	dampedScore := compositeScore * gameVolumeFactor
	
	return dampedScore
}

// GetPlayerMultiplayerRank gets a specific player's rank in the multiplayer leaderboard
func (mls *MultiplayerLeaderboardService) GetPlayerMultiplayerRank(playerID uint) (int, *LeaderboardEntry, error) {
	// Get full leaderboard (excluding unconfirmed to match displayed leaderboard)
	entries, err := mls.GetMultiplayerLeaderboard(0, false)
	if err != nil {
		return 0, nil, err
	}

	// Find the player
	for _, entry := range entries {
		if entry.PlayerID == playerID {
			return entry.Rank, &entry, nil
		}
	}

	return 0, nil, errors.New("player not found in multiplayer leaderboard")
}

// GetPlayerMultiplayerStats gets detailed stats for a specific player
func (mls *MultiplayerLeaderboardService) GetPlayerMultiplayerStats(playerID uint) (*models.MultiplayerPlayerStats, error) {
	var stats models.MultiplayerPlayerStats
	
	if err := mls.db.Preload("Player").Where("player_id = ?", playerID).First(&stats).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Player has no multiplayer stats yet
		}
		return nil, fmt.Errorf("failed to fetch player stats: %w", err)
	}

	return &stats, nil
}

// GetRecentMultiplayerGames gets recent multiplayer games for a player
func (mls *MultiplayerLeaderboardService) GetRecentMultiplayerGames(playerID uint, limit int) ([]models.MultiplayerGameResult, error) {
	var games []models.MultiplayerGameResult
	
	query := mls.db.Preload("Player1").Preload("Player2").Preload("Winner").
		Where("player1_id = ? OR player2_id = ?", playerID, playerID).
		Order("completed_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&games).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch recent games: %w", err)
	}

	return games, nil
}