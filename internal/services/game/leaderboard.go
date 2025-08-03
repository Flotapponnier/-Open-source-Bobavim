package game

import (
	"errors"
	"fmt"
	"time"

	"boba-vim/internal/cache"
	"boba-vim/internal/config"
	"boba-vim/internal/models"
	"boba-vim/internal/utils"

	"gorm.io/gorm"
)

// LeaderboardService handles leaderboard functionality
type LeaderboardService struct {
	db    *gorm.DB
	cfg   *config.Config
	cache *cache.RedisCache
}

// LeaderboardPosition represents a player's position in the leaderboard
type LeaderboardPosition struct {
	Rank              int    `json:"rank"`
	TotalPlayers      int    `json:"total_players"`
	Username          string `json:"username"`
	CompletionTime    int64  `json:"completion_time"`
	Score             int    `json:"score"`
	TotalMoves        int    `json:"total_moves"`
	SelectedCharacter string `json:"selected_character"`
	CharacterLevel    *int   `json:"character_level"`
}

// NewLeaderboardService creates a new leaderboard service
func NewLeaderboardService(db *gorm.DB, cfg *config.Config) *LeaderboardService {
	return &LeaderboardService{
		db:    db,
		cfg:   cfg,
		cache: cache.GlobalCache,
	}
}

// GetLeaderboard returns leaderboard data (backward compatibility)
func (ls *LeaderboardService) GetLeaderboard(boardType string, limit int) (map[string]interface{}, error) {
	return ls.GetLeaderboardByMap(boardType, limit, 0) // 0 means all maps
}

// GetLeaderboardByMap returns leaderboard data for a specific map using best scores
func (ls *LeaderboardService) GetLeaderboardByMap(boardType string, limit int, mapID int) (map[string]interface{}, error) {
	// Try to get from cache first
	cacheKey := fmt.Sprintf("leaderboard_%s_%d_%d", boardType, limit, mapID)
	if ls.cache != nil && ls.cache.IsAvailable() {
		var cachedResult map[string]interface{}
		if err := ls.cache.Get(cacheKey, &cachedResult); err == nil {
			return cachedResult, nil
		}
	}

	bestScoreService := NewPlayerBestScoreService(ls.db)

	var scores []models.PlayerBestScore
	var err error

	if mapID > 0 {
		scores, err = bestScoreService.GetLeaderboardForMap(mapID, limit)
	} else {
		scores, err = bestScoreService.GetOverallLeaderboard(limit)
	}

	if err != nil {
		return nil, err
	}

	leaderboard := ls.formatBestScoreEntries(scores)

	result := map[string]interface{}{
		"success":     true,
		"leaderboard": leaderboard,
		"type":        boardType,
		"map_id":      mapID,
	}

	// Cache the result for 3 minutes
	if ls.cache != nil && ls.cache.IsAvailable() {
		if err := ls.cache.Set(cacheKey, result, 3*time.Minute); err != nil {
			utils.Error("Failed to cache leaderboard: %v", err)
		}
	}

	return result, nil
}

// GetPlayerPosition returns a specific player's position in the leaderboard using best scores
func (ls *LeaderboardService) GetPlayerPosition(username string, boardType string, mapID int) (map[string]interface{}, error) {
	// First, get the player ID
	var player models.Player
	if err := ls.db.Where("username = ?", username).First(&player).Error; err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Player not found",
		}, nil
	}

	// Check if player's email is confirmed
	if !player.EmailConfirmed {
		return map[string]interface{}{
			"success": false,
			"error":   "Confirm your account to get in the leaderboard",
		}, nil
	}

	bestScoreService := NewPlayerBestScoreService(ls.db)

	var position *LeaderboardPosition
	var err error

	if mapID > 0 {
		position, err = bestScoreService.GetPlayerPositionForMap(player.ID, mapID)
	} else {
		position, err = bestScoreService.GetPlayerOverallPosition(player.ID)
	}

	if err != nil {
		// If it's a "record not found" error, return a more specific message
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return map[string]interface{}{
				"success": false,
				"error":   "Player has not completed this map yet",
			}, nil
		}
		return map[string]interface{}{
			"success": false,
			"error":   "Player not found in leaderboard",
		}, nil
	}

	playerEntry := map[string]interface{}{
		"rank":               position.Rank,
		"username":           position.Username,
		"selected_character": position.SelectedCharacter,
		"character_level":    position.CharacterLevel,
		"score":              position.Score,
		"completion_time":    position.CompletionTime,
		"completion_time_formatted": formatCompletionTime(position.CompletionTime),
		"total_moves":        position.TotalMoves,
		"total_players":      position.TotalPlayers,
		"map_id":             mapID,
	}

	return map[string]interface{}{
		"success":         true,
		"player_position": playerEntry,
		"type":            boardType,
		"map_id":          mapID,
	}, nil
}

// formatBestScoreEntries formats PlayerBestScore entries into leaderboard entries
func (ls *LeaderboardService) formatBestScoreEntries(scores []models.PlayerBestScore) []map[string]interface{} {
	var leaderboard []map[string]interface{}
	for i, score := range scores {
		entry := map[string]interface{}{
			"rank":               i + 1,
			"username":           score.Player.Username,
			"selected_character": score.SelectedCharacter,
			"character_level":    score.CharacterLevel,
			"score":              score.BestScore,
			"completion_time":    score.FastestTime,
			"completion_time_formatted": formatCompletionTime(score.FastestTime),
			"total_moves":        score.TotalMoves,
			"pearls_collected":   score.PearlsCollected,
			"map_id":             score.MapID,
			"completed_at":       score.CompletedAt.Format(time.RFC3339),
		}
		leaderboard = append(leaderboard, entry)
	}
	return leaderboard
}

// formatCompletionTime formats milliseconds into a readable time format
// Examples: 6.55 (for 6.55 seconds) or 2:06.55 (for 2 minutes 6.55 seconds)
func formatCompletionTime(milliseconds int64) string {
	if milliseconds <= 0 {
		return "0.00"
	}
	
	// Convert to seconds with 2 decimal places
	totalSecondsFloat := float64(milliseconds) / 1000.0
	
	// If less than 60 seconds, show as "6.55"
	if totalSecondsFloat < 60.0 {
		return fmt.Sprintf("%.2f", totalSecondsFloat)
	}
	
	// If 60 seconds or more, show as "2:06.55"
	minutes := int(totalSecondsFloat) / 60
	remainingSeconds := totalSecondsFloat - float64(minutes*60)
	
	return fmt.Sprintf("%d:%05.2f", minutes, remainingSeconds)
}

// formatLeaderboardEntries formats game sessions into leaderboard entries (kept for backward compatibility)
func (ls *LeaderboardService) formatLeaderboardEntries(sessions []models.GameSession) []map[string]interface{} {
	var leaderboard []map[string]interface{}
	for i, session := range sessions {
		entry := map[string]interface{}{
			"rank":               i + 1,
			"username":           session.Player.Username,
			"selected_character": session.SelectedCharacter,
			"score":              session.FinalScore,
			"completion_time":    session.CompletionTime,
			"total_moves":        session.TotalMoves,
			"pearls_collected":   session.PearlsCollected,
			"map_id":             session.MapID,
		}
		if session.CompletionTime != nil {
			entry["completion_time_formatted"] = formatCompletionTime(*session.CompletionTime)
		}
		if session.EndTime != nil {
			entry["completed_at"] = session.EndTime.Format(time.RFC3339)
		}
		leaderboard = append(leaderboard, entry)
	}
	return leaderboard
}
