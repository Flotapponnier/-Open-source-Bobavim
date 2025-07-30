package game_handler_modules

import (
	"net/http"
	"strconv"

	gameService "boba-vim/internal/services/game"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// GetLeaderboard returns leaderboard data
func GetLeaderboard(gameService *gameService.GameService, c *gin.Context) {
	boardType := c.DefaultQuery("type", "time")
	limitStr := c.DefaultQuery("limit", "10")
	playerPositionParam := c.Query("player_position")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 10
	}

	// If requesting player position, handle that separately
	if playerPositionParam == "true" {
		session := sessions.Default(c)
		username := session.Get("username")
		if username == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Not logged in",
			})
			return
		}

		result, err := gameService.Leaderboard.GetPlayerPosition(username.(string), boardType, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, result)
		return
	}

	result, err := gameService.GetLeaderboard(boardType, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetLeaderboardByMap returns leaderboard data for a specific map
func GetLeaderboardByMap(gameService *gameService.GameService, c *gin.Context) {
	boardType := c.DefaultQuery("type", "time")
	limitStr := c.DefaultQuery("limit", "10")
	mapIDStr := c.DefaultQuery("map_id", "0")
	playerPositionParam := c.Query("player_position")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 10
	}

	mapID, err := strconv.Atoi(mapIDStr)
	if err != nil || mapID < 0 {
		mapID = 0 // 0 means all maps
	}

	// If requesting player position, handle that separately
	if playerPositionParam == "true" {
		session := sessions.Default(c)
		username := session.Get("username")
		if username == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Not logged in",
			})
			return
		}

		result, err := gameService.Leaderboard.GetPlayerPosition(username.(string), boardType, mapID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, result)
		return
	}

	result, err := gameService.GetLeaderboardByMap(boardType, limit, mapID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetMultiplayerLeaderboard returns multiplayer leaderboard data
func GetMultiplayerLeaderboard(gameService *gameService.GameService, c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	playerPositionParam := c.Query("player_position")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 10
	}

	// If requesting player position, handle that separately
	if playerPositionParam == "true" {
		session := sessions.Default(c)
		userID := session.Get("user_id")
		username := session.Get("username")
		if userID == nil || username == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Not logged in",
			})
			return
		}

		// Check email confirmation using the same method as single-player
		result, err := gameService.Leaderboard.GetPlayerPosition(username.(string), "time", 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// If the result indicates unconfirmed user, return that error
		if success, exists := result["success"]; exists && !success.(bool) {
			if errorMsg, exists := result["error"]; exists && errorMsg.(string) == "Confirm your account to get in the leaderboard" {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"error":   "Confirm your account to get in the leaderboard",
				})
				return
			}
		}

		// Get player's rank and entry
		playerIDUint, ok := userID.(uint)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Invalid user ID format",
			})
			return
		}

		leaderboardService := gameService.NewMultiplayerLeaderboardService()
		rank, entry, err := leaderboardService.GetPlayerMultiplayerRank(playerIDUint)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// Format the response to match what the frontend expects
		playerPosition := map[string]interface{}{
			"rank":               rank,
			"username":           entry.Username,
			"selected_character": entry.SelectedCharacter,
			"character_level":    entry.CharacterLevel,
			"wins":               entry.TotalWins,
			"total_games":        entry.TotalGamesPlayed,
			"win_rate":           entry.WinRate,
		}

		c.JSON(http.StatusOK, gin.H{
			"success":         true,
			"player_position": playerPosition,
		})
		return
	}

	// Get full leaderboard
	leaderboardService := gameService.NewMultiplayerLeaderboardService()
	entries, err := leaderboardService.GetMultiplayerLeaderboard(limit, false) // Only confirmed accounts
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    entries,
	})
}

// GetMultiplayerPlayerStats returns detailed multiplayer stats for a specific player
func GetMultiplayerPlayerStats(gameService *gameService.GameService, c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Not logged in",
		})
		return
	}

	playerIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Invalid user ID format",
		})
		return
	}

	leaderboardService := gameService.NewMultiplayerLeaderboardService()
	stats, err := leaderboardService.GetPlayerMultiplayerStats(playerIDUint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if stats == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    nil,
			"message": "No multiplayer stats found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetMultiplayerRecentGames returns recent multiplayer games for a player
func GetMultiplayerRecentGames(gameService *gameService.GameService, c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Not logged in",
		})
		return
	}

	playerIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Invalid user ID format",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 10
	}

	leaderboardService := gameService.NewMultiplayerLeaderboardService()
	games, err := leaderboardService.GetRecentMultiplayerGames(playerIDUint, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    games,
	})
}

