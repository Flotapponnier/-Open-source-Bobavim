package matchmaking

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketConnection wraps a WebSocket connection with write protection
type WebSocketConnection struct {
	conn      *websocket.Conn
	writeMu   sync.Mutex
}

// WebSocketManager manages WebSocket connections for matchmaking
type WebSocketManager struct {
	connections map[uint]*WebSocketConnection
	mu          sync.RWMutex
	upgrader    websocket.Upgrader
}

// NewWebSocketManager creates a new WebSocket manager
func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		connections: make(map[uint]*WebSocketConnection),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
}

// AddConnection adds a new WebSocket connection for a player
func (wsm *WebSocketManager) AddConnection(playerID uint, conn *websocket.Conn) {
	wsm.mu.Lock()
	defer wsm.mu.Unlock()
	
	// Close existing connection if any
	if existingConn, exists := wsm.connections[playerID]; exists {
		existingConn.conn.Close()
	}
	
	wsm.connections[playerID] = &WebSocketConnection{
		conn:    conn,
		writeMu: sync.Mutex{},
	}
	log.Printf("WebSocket connection added for player %d", playerID)
}

// RemoveConnection removes a WebSocket connection
func (wsm *WebSocketManager) RemoveConnection(playerID uint) {
	wsm.mu.Lock()
	defer wsm.mu.Unlock()
	
	if wsConn, exists := wsm.connections[playerID]; exists {
		wsConn.conn.Close()
		delete(wsm.connections, playerID)
		log.Printf("WebSocket connection removed for player %d", playerID)
	}
}

// SendMessage sends a message to a specific player
func (wsm *WebSocketManager) SendMessage(playerID uint, message interface{}) error {
	wsm.mu.RLock()
	wsConn, exists := wsm.connections[playerID]
	wsm.mu.RUnlock()
	
	if !exists {
		return ErrPlayerNotConnected
	}
	
	// Use write mutex to prevent concurrent writes to the same connection
	wsConn.writeMu.Lock()
	defer wsConn.writeMu.Unlock()
	
	wsConn.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return wsConn.conn.WriteJSON(message)
}

// BroadcastToPlayers sends a message to multiple players with optimized concurrency
func (wsm *WebSocketManager) BroadcastToPlayers(playerIDs []uint, message interface{}) {
	wsm.mu.RLock()
	
	// Create a copy of connections to minimize lock time
	connsCopy := make(map[uint]*WebSocketConnection, len(playerIDs))
	for _, playerID := range playerIDs {
		if wsConn, exists := wsm.connections[playerID]; exists {
			connsCopy[playerID] = wsConn
		}
	}
	wsm.mu.RUnlock()
	
	// Use a channel to limit concurrent writes and avoid overwhelming the system
	maxConcurrent := 50 // Reduced from 100 for better performance
	semaphore := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	
	for playerID, wsConn := range connsCopy {
		wg.Add(1)
		semaphore <- struct{}{} // Acquire
		go func(conn *WebSocketConnection, pID uint) {
			defer func() { 
				<-semaphore // Release
				wg.Done()
			}()
			
			// Use write mutex to prevent concurrent writes
			conn.writeMu.Lock()
			defer conn.writeMu.Unlock()
			
			conn.conn.SetWriteDeadline(time.Now().Add(1 * time.Second)) // Reduced from 3s
			if err := conn.conn.WriteJSON(message); err != nil {
				log.Printf("Failed to send message to player %d: %v", pID, err)
			}
		}(wsConn, playerID)
	}
	
	// Wait for all messages to be sent with timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		// All messages sent successfully
	case <-time.After(2 * time.Second): // Reduced timeout
		log.Printf("Timeout broadcasting to %d players", len(playerIDs))
	}
}

// IsPlayerConnected checks if a player has an active WebSocket connection
func (wsm *WebSocketManager) IsPlayerConnected(playerID uint) bool {
	wsm.mu.RLock()
	defer wsm.mu.RUnlock()
	
	_, exists := wsm.connections[playerID]
	return exists
}

// GetConnectedPlayers returns a list of all connected player IDs
func (wsm *WebSocketManager) GetConnectedPlayers() []uint {
	wsm.mu.RLock()
	defer wsm.mu.RUnlock()
	
	playerIDs := make([]uint, 0, len(wsm.connections))
	for playerID := range wsm.connections {
		playerIDs = append(playerIDs, playerID)
	}
	return playerIDs
}

// HandleConnection handles a WebSocket connection for matchmaking
func (wsm *WebSocketManager) HandleConnection(w http.ResponseWriter, r *http.Request, playerID uint) {
	conn, err := wsm.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket connection: %v", err)
		return
	}
	
	wsm.AddConnection(playerID, conn)
	
	// Handle incoming messages and connection cleanup
	go wsm.handleConnectionMessages(playerID, conn)
}

// handleConnectionMessages handles incoming WebSocket messages
func (wsm *WebSocketManager) handleConnectionMessages(playerID uint, conn *websocket.Conn) {
	defer func() {
		wsm.RemoveConnection(playerID)
	}()
	
	// Set up ping/pong to keep connection alive
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	// Start ping ticker
	ticker := time.NewTicker(54 * time.Second)
	defer ticker.Stop()
	
	go func() {
		for {
			select {
			case <-ticker.C:
				// Get the WebSocket connection safely
				wsm.mu.RLock()
				wsConn, exists := wsm.connections[playerID]
				wsm.mu.RUnlock()
				
				if !exists {
					return
				}
				
				// Use write mutex for ping message
				wsConn.writeMu.Lock()
				wsConn.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				err := wsConn.conn.WriteMessage(websocket.PingMessage, nil)
				wsConn.writeMu.Unlock()
				
				if err != nil {
					return
				}
			}
		}
	}()
	
	// Listen for messages
	for {
		var rawMsg json.RawMessage
		if err := conn.ReadJSON(&rawMsg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for player %d: %v", playerID, err)
			}
			break
		}
		
		// For now, we'll just log incoming messages
		// The actual matchmaking logic is handled via HTTP endpoints
		log.Printf("Received message from player %d: %s", playerID, string(rawMsg))
	}
}

// Cleanup closes all connections and cleans up resources
func (wsm *WebSocketManager) Cleanup() {
	wsm.mu.Lock()
	defer wsm.mu.Unlock()
	
	for playerID, wsConn := range wsm.connections {
		wsConn.conn.Close()
		log.Printf("Closed WebSocket connection for player %d", playerID)
	}
	
	wsm.connections = make(map[uint]*WebSocketConnection)
}