package multiplayer

import (
	"boba-vim/internal/constant"
	"sync"
)

// Game constants - using constants from constant package
const (
	EMPTY          = constant.EMPTY
	PLAYER         = constant.PLAYER
	ENEMY          = constant.ENEMY
	PEARL          = constant.PEARL
	PEARL_MOLD     = constant.PEARL_MOLD
)

// GameState represents the state of a multiplayer game
type GameState struct {
	TextGrid        [][]string
	GameMap         [][]int
	MapID           int
	Player1Row      int
	Player1Col      int
	Player2Row      int
	Player2Col      int
	PearlRow        int
	PearlCol        int
	mutex           sync.RWMutex
}

// Position represents a position in the game
type Position struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// NewGameState creates a new multiplayer game state
func NewGameState(mapContent [][]string, mapID int) *GameState {
	textGrid := make([][]string, len(mapContent))
	for i, row := range mapContent {
		textGrid[i] = make([]string, len(row))
		copy(textGrid[i], row)
	}
	
	gameMap := createMultiplayerGameMap(textGrid)
	
	// Place initial pearl
	pearlRow, pearlCol := placePearlInMap(gameMap, -1, -1) // Don't avoid any positions initially
	
	return &GameState{
		TextGrid: textGrid,
		GameMap:  gameMap,
		MapID:    mapID,
		PearlRow: pearlRow,
		PearlCol: pearlCol,
	}
}

// GetGameMap returns a copy of the game map
func (gs *GameState) GetGameMap() [][]int {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	// Create a copy to avoid race conditions
	mapCopy := make([][]int, len(gs.GameMap))
	for i, row := range gs.GameMap {
		mapCopy[i] = make([]int, len(row))
		copy(mapCopy[i], row)
	}
	
	return mapCopy
}

// GetTextGrid returns a copy of the text grid
func (gs *GameState) GetTextGrid() [][]string {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	// Create a copy to avoid race conditions
	textCopy := make([][]string, len(gs.TextGrid))
	for i, row := range gs.TextGrid {
		textCopy[i] = make([]string, len(row))
		copy(textCopy[i], row)
	}
	
	return textCopy
}

// createMultiplayerGameMap creates a game map for multiplayer (no player initially placed)
func createMultiplayerGameMap(textGrid [][]string) [][]int {
	gameMap := make([][]int, len(textGrid))
	
	for rowIdx, row := range textGrid {
		mapRow := make([]int, len(row))
		for colIdx := range row {
			mapRow[colIdx] = EMPTY // All empty initially
		}
		gameMap[rowIdx] = mapRow
	}
	
	return gameMap
}