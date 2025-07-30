package utils

import (
	"sync"
)

// GameStatePool manages reusable game state objects to reduce garbage collection
type GameStatePool struct {
	pool sync.Pool
}

// NewGameStatePool creates a new game state object pool
func NewGameStatePool() *GameStatePool {
	return &GameStatePool{
		pool: sync.Pool{
			New: func() interface{} {
				return &GameState{
					GameMap:  make([][]int, 0, 50),
					TextGrid: make([][]string, 0, 50),
				}
			},
		},
	}
}

// Get retrieves a game state object from the pool
func (gsp *GameStatePool) Get() *GameState {
	return gsp.pool.Get().(*GameState)
}

// Put returns a game state object to the pool after cleaning it
func (gsp *GameStatePool) Put(gs *GameState) {
	// Clear the slices but keep the capacity
	gs.GameMap = gs.GameMap[:0]
	gs.TextGrid = gs.TextGrid[:0]
	gs.PlayerRow = 0
	gs.PlayerCol = 0
	gs.PearlRow = 0
	gs.PearlCol = 0
	
	gsp.pool.Put(gs)
}

// GameState represents a pooled game state object
type GameState struct {
	GameMap   [][]int
	TextGrid  [][]string
	PlayerRow int
	PlayerCol int
	PearlRow  int
	PearlCol  int
}

// MessagePool manages reusable WebSocket message objects
type MessagePool struct {
	pool sync.Pool
}

// NewMessagePool creates a new message object pool
func NewMessagePool() *MessagePool {
	return &MessagePool{
		pool: sync.Pool{
			New: func() interface{} {
				return &WebSocketMessage{
					Data: make(map[string]interface{}, 10),
				}
			},
		},
	}
}

// WebSocketMessage represents a pooled WebSocket message
type WebSocketMessage struct {
	Type      string
	Message   string
	Data      map[string]interface{}
	Timestamp interface{}
}

// Get retrieves a message object from the pool
func (mp *MessagePool) Get() *WebSocketMessage {
	return mp.pool.Get().(*WebSocketMessage)
}

// Put returns a message object to the pool after cleaning it
func (mp *MessagePool) Put(msg *WebSocketMessage) {
	// Clear the message but keep the capacity
	msg.Type = ""
	msg.Message = ""
	msg.Timestamp = nil
	
	// Clear the data map but keep the capacity
	for k := range msg.Data {
		delete(msg.Data, k)
	}
	
	mp.pool.Put(msg)
}

// ResponsePool manages reusable response objects for API responses
type ResponsePool struct {
	pool sync.Pool
}

// NewResponsePool creates a new response object pool
func NewResponsePool() *ResponsePool {
	return &ResponsePool{
		pool: sync.Pool{
			New: func() interface{} {
				return make(map[string]interface{}, 20)
			},
		},
	}
}

// Get retrieves a response object from the pool
func (rp *ResponsePool) Get() map[string]interface{} {
	return rp.pool.Get().(map[string]interface{})
}

// Put returns a response object to the pool after cleaning it
func (rp *ResponsePool) Put(response map[string]interface{}) {
	// Clear the map but keep the capacity
	for k := range response {
		delete(response, k)
	}
	
	rp.pool.Put(response)
}

// Global pools for reuse across the application
var (
	GameStatePoolInstance = NewGameStatePool()
	MessagePoolInstance   = NewMessagePool()
	ResponsePoolInstance  = NewResponsePool()
)