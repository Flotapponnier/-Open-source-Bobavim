package game_handler_modules

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"boba-vim/internal/services/game"
	"boba-vim/internal/services/matchmaking"
	"boba-vim/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// GetMultiplayerGameState handles getting the current state of a multiplayer game
func GetMultiplayerGameState(multiplayerGame *game.MultiplayerGameService, c *gin.Context) {
	// Get player info from session
	playerID, _, err := matchmaking.ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get game ID from URL parameter
	gameID := c.Param("gameID")
	if gameID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Game ID is required"})
		return
	}

	// Get game state
	gameState, err := multiplayerGame.GetGameState(gameID, playerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get game state"})
		return
	}

	c.JSON(http.StatusOK, gameState)
}

// ProcessMultiplayerMove handles processing a move in a multiplayer game
func ProcessMultiplayerMove(multiplayerGame *game.MultiplayerGameService, c *gin.Context) {
	// Get player info from session
	playerID, _, err := matchmaking.ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get game ID from URL parameter
	gameID := c.Param("gameID")
	if gameID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Game ID is required"})
		return
	}

	// Parse request body
	var moveRequest struct {
		Direction        string `json:"direction"`
		Count            int    `json:"count"`
		HasExplicitCount bool   `json:"has_explicit_count"`
	}

	if err := c.ShouldBindJSON(&moveRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid move request"})
		return
	}

	// Set default count if not provided
	if moveRequest.Count == 0 {
		moveRequest.Count = 1
	}

	// Process the move
	result, err := multiplayerGame.ProcessMove(gameID, playerID, moveRequest.Direction, moveRequest.Count, moveRequest.HasExplicitCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process move"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetMultiplayerGameByMatchID handles getting a multiplayer game by match ID
func GetMultiplayerGameByMatchID(multiplayerGame *game.MultiplayerGameService, c *gin.Context) {
	// Get player info from session
	playerID, _, err := matchmaking.ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get match ID from query parameter
	matchID := c.Query("match_id")
	if matchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Match ID is required"})
		return
	}

	// Get game state by match ID
	gameState, err := multiplayerGame.GetGameByMatchID(matchID, playerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get game state"})
		return
	}

	c.JSON(http.StatusOK, gameState)
}

// HandleMultiplayerDisconnect handles when a player disconnects from a multiplayer game
func HandleMultiplayerDisconnect(multiplayerGame *game.MultiplayerGameService, c *gin.Context) {
	// Get player info from session
	playerID, _, err := matchmaking.ValidatePlayerSession(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Handle player disconnect
	multiplayerGame.HandlePlayerDisconnect(playerID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Player disconnected from multiplayer game",
	})
}

// WebSocket upgrader
var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

// GameConnectionManager manages WebSocket connections per game for better concurrency
type GameConnectionManager struct {
	games sync.Map // map[string]*GameConnections - lock-free for better performance
}

type GameConnections struct {
	connections map[uint]*websocket.Conn
	mutex       sync.RWMutex
}

var gameConnectionManager = &GameConnectionManager{}

// addGameConnection adds a WebSocket connection for a specific game and player
func addGameConnection(gameID string, playerID uint, conn *websocket.Conn) {
	// Get or create game connections
	gameConns, _ := gameConnectionManager.games.LoadOrStore(gameID, &GameConnections{
		connections: make(map[uint]*websocket.Conn),
	})
	
	gc := gameConns.(*GameConnections)
	gc.mutex.Lock()
	gc.connections[playerID] = conn
	gc.mutex.Unlock()
	
	utils.Debug("Added WebSocket connection for player %d in game %s", playerID, gameID)
}

// removeGameConnection removes a WebSocket connection for a specific game and player
func removeGameConnection(gameID string, playerID uint) {
	if gameConns, exists := gameConnectionManager.games.Load(gameID); exists {
		gc := gameConns.(*GameConnections)
		gc.mutex.Lock()
		delete(gc.connections, playerID)
		isEmpty := len(gc.connections) == 0
		gc.mutex.Unlock()
		
		// Clean up empty game connections
		if isEmpty {
			gameConnectionManager.games.Delete(gameID)
		}
	}
	utils.Debug("Removed WebSocket connection for player %d in game %s", playerID, gameID)
}

// areBothPlayersConnectedToGame checks if both players are connected to a game
func areBothPlayersConnectedToGame(multiplayerGame *game.MultiplayerGameService, gameID string) bool {
	game := multiplayerGame.GetGameByID(gameID)
	if game == nil {
		return false
	}
	
	gameConns, exists := gameConnectionManager.games.Load(gameID)
	if !exists {
		return false
	}
	
	gc := gameConns.(*GameConnections)
	gc.mutex.RLock()
	_, player1Connected := gc.connections[game.Player1ID]
	_, player2Connected := gc.connections[game.Player2ID]
	gc.mutex.RUnlock()
	
	utils.Debug("Game %s connection status: P1(%d)=%v, P2(%d)=%v", 
		gameID, game.Player1ID, player1Connected, game.Player2ID, player2Connected)
	
	return player1Connected && player2Connected
}

// sendCountdownToGame sends countdown messages to both players in a game
func sendCountdownToGame(multiplayerGame *game.MultiplayerGameService, gameID string) {
	game := multiplayerGame.GetGameByID(gameID)
	if game == nil {
		utils.Error("Game %s not found for countdown", gameID)
		return
	}
	
	// Check if countdown can be started and set initial state
	if !multiplayerGame.SetCountdownState(gameID, true, true) {
		utils.Debug("Countdown already started for game %s", gameID)
		return
	}
	
	utils.Info("Starting countdown for game %s", gameID)
	
	// Use ticker for more efficient timing
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	// Send 3-2-1 countdown
	for countdown := 3; countdown > 0; countdown-- {
		message := map[string]interface{}{
			"type": "countdown",
			"data": map[string]interface{}{
				"value":  countdown,
				"active": true,
			},
		}
		
		sendMessageToGamePlayersAsync(gameID, message)
		log.Printf("✅ Sent countdown %d for game %s", countdown, gameID)
		
		if countdown > 1 {
			<-ticker.C // Wait for next tick
		}
	}
	
	// Send GO message
	goMessage := map[string]interface{}{
		"type": "countdown",
		"data": map[string]interface{}{
			"value":  "GO",
			"active": false,
		},
	}
	
	sendMessageToGamePlayersAsync(gameID, goMessage)
	
	// Wait a moment to ensure GO message is received before allowing movement
	time.Sleep(500 * time.Millisecond)
	
	// Unblock movement after countdown finishes
	multiplayerGame.SetCountdownState(gameID, true, false)
	
	log.Printf("🏁 Countdown finished for game %s - game is now active and movement unlocked", gameID)
}

// sendMessageToGamePlayersAsync sends a message to all players in a game asynchronously
func sendMessageToGamePlayersAsync(gameID string, message interface{}) {
	gameConns, exists := gameConnectionManager.games.Load(gameID)
	if !exists {
		log.Printf("❌ No connections found for game %s", gameID)
		return
	}
	
	gc := gameConns.(*GameConnections)
	gc.mutex.RLock()
	
	// Create a copy of connections to avoid holding lock during writes
	connsCopy := make(map[uint]*websocket.Conn, len(gc.connections))
	for playerID, conn := range gc.connections {
		connsCopy[playerID] = conn
	}
	gc.mutex.RUnlock()
	
	// Send messages in parallel with timeout protection
	var wg sync.WaitGroup
	for playerID, conn := range connsCopy {
		wg.Add(1)
		go func(pID uint, c *websocket.Conn) {
			defer wg.Done()
			
			// Set write deadline to prevent blocking
			c.SetWriteDeadline(time.Now().Add(2 * time.Second))
			
			err := c.WriteJSON(message)
			if err != nil {
				log.Printf("❌ Failed to send message to player %d in game %s: %v", pID, gameID, err)
			} else {
				log.Printf("📤 Sent message to player %d in game %s", pID, gameID)
			}
		}(playerID, conn)
	}
	
	// Wait for all messages to be sent with timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		// All messages sent
	case <-time.After(5 * time.Second):
		log.Printf("⚠️ Timeout sending messages to game %s", gameID)
	}
}

// sendMessageToGamePlayers sends a message to all players in a game (kept for compatibility)
func sendMessageToGamePlayers(gameID string, message interface{}) {
	sendMessageToGamePlayersAsync(gameID, message)
}

// HandleMultiplayerGameWebSocket handles WebSocket connections for multiplayer games
func HandleMultiplayerGameWebSocket(multiplayerGame *game.MultiplayerGameService, c *gin.Context) {
	log.Printf("🔌 WebSocket connection attempt for game %s", c.Param("gameID"))
	
	// Get game ID from URL parameter
	gameID := c.Param("gameID")
	if gameID == "" {
		log.Printf("❌ Missing game ID in WebSocket request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Game ID is required"})
		return
	}
	
	// Get player info from session
	playerID, _, err := matchmaking.ValidatePlayerSession(c)
	if err != nil {
		log.Printf("❌ WebSocket session validation failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	log.Printf("✅ WebSocket session validated for player %d", playerID)

	// Upgrade connection to WebSocket
	log.Printf("🔄 Attempting WebSocket upgrade for game %s", gameID)
	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("❌ Failed to upgrade to WebSocket: %v", err)
		return
	}
	log.Printf("✅ WebSocket upgrade successful for game %s", gameID)
	
	// Register connection with the WebSocket manager for game updates
	multiplayerGame.RegisterWebSocketConnection(playerID, conn)
	// Also register with our game-specific connection manager
	addGameConnection(gameID, playerID, conn)
	log.Printf("🔗 WebSocket connection registered for player %d in game %s", playerID, gameID)
	
	defer func() {
		conn.Close()
		// Remove connection from WebSocket manager
		multiplayerGame.UnregisterWebSocketConnection(playerID)
		// Remove from game-specific connection manager
		removeGameConnection(gameID, playerID)
		// Handle player disconnect when WebSocket closes
		multiplayerGame.HandlePlayerDisconnect(playerID)
		log.Printf("Player %d disconnected from multiplayer game %s", playerID, gameID)
	}()

	log.Printf("Player %d connected to multiplayer game %s via WebSocket", playerID, gameID)

	// Set up ping/pong handlers to keep connection alive
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Start ping ticker to keep connection alive
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// Use goroutines to handle reads and writes concurrently
	done := make(chan bool)
	
	// Handle incoming messages from client
	go func() {
		defer func() {
			done <- true
		}()
		
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		
		for {
			messageType, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket read error: %v", err)
				}
				break
			}

			// Reset read deadline on each message
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))

			// Handle different message types
			switch messageType {
			case websocket.TextMessage:
				// Handle text messages (e.g., countdown status requests)
				var msg map[string]interface{}
				if err := json.Unmarshal(message, &msg); err == nil {
					if msgType, ok := msg["type"].(string); ok {
						if msgType == "request_countdown_status" {
							log.Printf("🎯 Player %d requested countdown status for game %s", playerID, gameID)
							
							// Check if both players are connected to this game
							if areBothPlayersConnectedToGame(multiplayerGame, gameID) {
								log.Printf("🔥 Both players connected, starting countdown for game %s", gameID)
								go sendCountdownToGame(multiplayerGame, gameID)
							} else {
								log.Printf("⏸️ Waiting for both players to connect to game %s", gameID)
							}
						}
					}
				}
				log.Printf("Received text message from player %d: %s", playerID, string(message))
			case websocket.BinaryMessage:
				// Handle binary messages if needed
				log.Printf("Received binary message from player %d", playerID)
			case websocket.CloseMessage:
				log.Printf("WebSocket connection closed by client")
				return
			case websocket.PingMessage:
				// Respond to ping with pong
				conn.WriteMessage(websocket.PongMessage, []byte{})
			}
		}
	}()

	// Handle outgoing messages and pings
	for {
		select {
		case <-done:
			// Read goroutine finished, close connection
			return
		case <-pingTicker.C:
			// Send ping to keep connection alive
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Failed to send ping to player %d: %v", playerID, err)
				return
			}
		}
	}
}