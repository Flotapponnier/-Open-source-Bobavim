package handlers

import (
	"boba-vim/internal/config"
	"boba-vim/internal/handlers/game_handler_modules"
	gameService "boba-vim/internal/services/game"
	"boba-vim/internal/services/matchmaking"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GameHandler struct {
	gameService        *gameService.GameService
	matchmakingService *matchmaking.MatchmakingService
	multiplayerGame    *gameService.MultiplayerGameService
	cfg                *config.Config
	db                 *gorm.DB
}

func NewGameHandler(db *gorm.DB) *GameHandler {
	cfg := config.Load()
	
	// Create multiplayer game service with its own WebSocket manager
	multiplayerGame := gameService.NewMultiplayerGameService(db, cfg, nil)
	
	// Create matchmaking service with multiplayer game service
	matchmakingService := matchmaking.NewMatchmakingService(db, multiplayerGame)
	
	return &GameHandler{
		gameService:        gameService.NewGameService(db, cfg, nil),
		matchmakingService: matchmakingService,
		multiplayerGame:    multiplayerGame,
		cfg:                cfg,
		db:                 db,
	}
}

func NewGameHandlerWithPearlMold(db *gorm.DB, pearlMoldService *gameService.PearlMoldService) *GameHandler {
	cfg := config.Load()
	
	// Create multiplayer game service with its own WebSocket manager
	multiplayerGame := gameService.NewMultiplayerGameService(db, cfg, nil)
	
	// Create matchmaking service with multiplayer game service
	matchmakingService := matchmaking.NewMatchmakingService(db, multiplayerGame)
	
	return &GameHandler{
		gameService:        gameService.NewGameService(db, cfg, pearlMoldService),
		matchmakingService: matchmakingService,
		multiplayerGame:    multiplayerGame,
		cfg:                cfg,
		db:                 db,
	}
}

// Session Management Handlers
func (gh *GameHandler) SetUsername(c *gin.Context) {
	game_handler_modules.SetUsername(c)
}

func (gh *GameHandler) GetGameState(c *gin.Context) {
	game_handler_modules.GetGameState(gh.gameService, c)
}

func (gh *GameHandler) StartGameWithMap(c *gin.Context) {
	game_handler_modules.StartGameWithMap(gh.gameService, c)
}

func (gh *GameHandler) QuitGame(c *gin.Context) {
	game_handler_modules.QuitGame(gh.db, c)
}

func (gh *GameHandler) PauseGame(c *gin.Context) {
	game_handler_modules.PauseGame(gh.db, c)
}

func (gh *GameHandler) ResumeGame(c *gin.Context) {
	game_handler_modules.ResumeGame(gh.db, c)
}

func (gh *GameHandler) RestartGame(c *gin.Context) {
	game_handler_modules.RestartGame(gh.gameService, c)
}

// Movement & Gameplay Handlers
func (gh *GameHandler) MovePlayer(c *gin.Context) {
	game_handler_modules.MovePlayer(gh.gameService, c)
}


// Map Management Handlers
func (gh *GameHandler) GetMaps(c *gin.Context) {
	game_handler_modules.GetMaps(c)
}


// Leaderboard & Statistics Handlers
func (gh *GameHandler) GetLeaderboard(c *gin.Context) {
	game_handler_modules.GetLeaderboard(gh.gameService, c)
}

func (gh *GameHandler) GetLeaderboardByMap(c *gin.Context) {
	game_handler_modules.GetLeaderboardByMap(gh.gameService, c)
}

func (gh *GameHandler) GetMultiplayerLeaderboard(c *gin.Context) {
	game_handler_modules.GetMultiplayerLeaderboard(gh.gameService, c)
}

func (gh *GameHandler) GetMultiplayerPlayerStats(c *gin.Context) {
	game_handler_modules.GetMultiplayerPlayerStats(gh.gameService, c)
}

func (gh *GameHandler) GetMultiplayerRecentGames(c *gin.Context) {
	game_handler_modules.GetMultiplayerRecentGames(gh.gameService, c)
}

func (gh *GameHandler) GetMultiplayerPlayerPosition(c *gin.Context) {
	// Use the existing GetMultiplayerLeaderboard with player_position=true
	c.Request.URL.RawQuery = "player_position=true"
	gh.GetMultiplayerLeaderboard(c)
}


// Online Multiplayer Handlers
func (gh *GameHandler) PlayOnline(c *gin.Context) {
	game_handler_modules.PlayOnline(gh.matchmakingService, c)
}

func (gh *GameHandler) CheckMatchmaking(c *gin.Context) {
	game_handler_modules.CheckMatchmaking(gh.matchmakingService, c)
}

func (gh *GameHandler) CancelMatchmaking(c *gin.Context) {
	game_handler_modules.CancelMatchmaking(gh.matchmakingService, c)
}

// WebSocket Matchmaking Handler
func (gh *GameHandler) HandleMatchmakingWebSocket(c *gin.Context) {
	gh.matchmakingService.HandleWebSocketConnection(c)
}

// Join Matchmaking Queue Handler
func (gh *GameHandler) JoinMatchmakingQueue(c *gin.Context) {
	gh.matchmakingService.JoinQueue(c)
}

// Leave Matchmaking Queue Handler
func (gh *GameHandler) LeaveMatchmakingQueue(c *gin.Context) {
	gh.matchmakingService.LeaveQueue(c)
}

// Accept/Reject Match Handler
func (gh *GameHandler) RespondToMatch(c *gin.Context) {
	gh.matchmakingService.AcceptMatch(c)
}

// Get Queue Status Handler
func (gh *GameHandler) GetQueueStatus(c *gin.Context) {
	gh.matchmakingService.GetQueueStatus(c)
}

// Multiplayer Game Handlers
func (gh *GameHandler) GetMultiplayerGameState(c *gin.Context) {
	game_handler_modules.GetMultiplayerGameState(gh.multiplayerGame, c)
}

func (gh *GameHandler) ProcessMultiplayerMove(c *gin.Context) {
	game_handler_modules.ProcessMultiplayerMove(gh.multiplayerGame, c)
}

func (gh *GameHandler) GetMultiplayerGameByMatchID(c *gin.Context) {
	game_handler_modules.GetMultiplayerGameByMatchID(gh.multiplayerGame, c)
}

func (gh *GameHandler) HandleMultiplayerDisconnect(c *gin.Context) {
	game_handler_modules.HandleMultiplayerDisconnect(gh.multiplayerGame, c)
}

// WebSocket Multiplayer Game Handler
func (gh *GameHandler) HandleMultiplayerGameWebSocket(c *gin.Context) {
	game_handler_modules.HandleMultiplayerGameWebSocket(gh.multiplayerGame, c)
}

// User Progress Handlers
func (gh *GameHandler) GetCompletedMaps(c *gin.Context) {
	game_handler_modules.GetCompletedMaps(gh.db, c)
}

func (gh *GameHandler) MigrateGuestProgress(c *gin.Context) {
	game_handler_modules.MigrateGuestProgress(gh.db, c)
}

// Cleanup shuts down the game handler and its services
func (gh *GameHandler) Cleanup() {
	if gh.matchmakingService != nil {
		gh.matchmakingService.Cleanup()
	}
	if gh.multiplayerGame != nil {
		gh.multiplayerGame.Cleanup()
	}
}