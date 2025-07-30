package game

import (
	"boba-vim/internal/constant"
	"math/rand"
	"strings"
	"time"
)

// Game constants - using constants from constant package
const (
	INITIAL_PEARLS = constant.INITIAL_PEARLS
	EMPTY          = constant.EMPTY
	PLAYER         = constant.PLAYER
	ENEMY          = constant.ENEMY
	PEARL          = constant.PEARL
	PEARL_MOLD     = constant.PEARL_MOLD
)

// InitializeGameSessionWithMap creates a new game with a specific map
func InitializeGameSessionWithMap(mapID int) map[string]interface{} {
	textGrid := createTextLinesWithMap(mapID)
	gameMap := createGameMap(textGrid)

	// For hard and medium difficulty maps, place enemies
	gameMapData := constant.GetMapByID(mapID)
	if gameMapData != nil {
		if gameMapData.Difficulty == "hard" {
			placeEnemies(gameMap, 0, 0, 5)
			// Place pearl mold only on hard difficulty maps
			placePearlMold(gameMap, 0, 0)
		} else if gameMapData.Difficulty == "medium" {
			placeEnemies(gameMap, 0, 0, 3)
		}
	}

	return map[string]interface{}{
		"text_grid":        textGrid,
		"game_map":         gameMap,
		"player_pos":       map[string]int{"row": 0, "col": 0},
		"preferred_column": 0,
		"map_id":           mapID,
	}
}

// createTextLinesWithMap creates text grid from a specific map
func createTextLinesWithMap(mapID int) [][]string {
	gameMap := constant.GetMapByID(mapID)
	if gameMap == nil {
		// Fallback to first map if ID not found
		fallbackMap := constant.GetMapByID(1)
		if fallbackMap != nil {
			return CreateTextGridFromString(fallbackMap.TextPattern)
		}
		// Ultimate fallback
		return [][]string{{"h", "e", "l", "l", "o"}}
	}

	return CreateTextGridFromString(gameMap.TextPattern)
}

// CreateTextGridFromString converts a text string to a 2D character grid
func CreateTextGridFromString(text string) [][]string {
	// Split text into lines preserving all whitespace structure
	lines := strings.Split(text, "\n")

	// Convert lines to character grid
	var grid [][]string
	for _, line := range lines {
		row := make([]string, len(line))
		for i, char := range line {
			row[i] = string(char)
		}
		grid = append(grid, row)
	}

	return grid
}

// createGameMap creates initial game map with player at (0,0)
func createGameMap(textGrid [][]string) [][]int {
	gameMap := make([][]int, len(textGrid))

	for rowIdx, row := range textGrid {
		mapRow := make([]int, len(row))
		for colIdx := range row {
			if rowIdx == 0 && colIdx == 0 {
				mapRow[colIdx] = PLAYER // Player position
			} else {
				mapRow[colIdx] = EMPTY // Empty space
			}
		}
		gameMap[rowIdx] = mapRow
	}

	// Place one pearl randomly
	placeNewPearl(gameMap, 0, 0)
	
	return gameMap
}

// placeNewPearl places a new pearl at random empty position
func placeNewPearl(gameMap [][]int, playerRow, playerCol int) {
	rand.Seed(time.Now().UnixNano())

	// Find all empty positions (avoid player, enemies, pearls, and pearl molds)
	var emptyPositions [][2]int
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == EMPTY && !(rowIdx == playerRow && colIdx == playerCol) {
				emptyPositions = append(emptyPositions, [2]int{rowIdx, colIdx})
			}
		}
	}

	// Place pearl at random empty position
	if len(emptyPositions) > 0 {
		pos := emptyPositions[rand.Intn(len(emptyPositions))]
		gameMap[pos[0]][pos[1]] = PEARL
	}
}

// placeEnemies places specified number of enemies randomly on the map
func placeEnemies(gameMap [][]int, playerRow, playerCol, numEnemies int) {
	rand.Seed(time.Now().UnixNano())

	// Find all empty positions (avoid player, pearls, and pearl molds)
	var emptyPositions [][2]int
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == EMPTY && !(rowIdx == playerRow && colIdx == playerCol) {
				emptyPositions = append(emptyPositions, [2]int{rowIdx, colIdx})
			}
		}
	}

	// Place specified number of enemies at random empty positions
	enemiesToPlace := numEnemies
	if len(emptyPositions) < enemiesToPlace {
		enemiesToPlace = len(emptyPositions)
	}

	for i := 0; i < enemiesToPlace; i++ {
		if len(emptyPositions) > 0 {
			// Pick random position
			posIndex := rand.Intn(len(emptyPositions))
			pos := emptyPositions[posIndex]
			gameMap[pos[0]][pos[1]] = ENEMY

			// Remove this position from available positions
			emptyPositions = append(emptyPositions[:posIndex], emptyPositions[posIndex+1:]...)
		}
	}
}

// PlaceNewPearl is the exported version for external use
func PlaceNewPearl(gameMap [][]int, excludeRow, excludeCol int) {
	placeNewPearl(gameMap, excludeRow, excludeCol)
}

// placePearlMold places a pearl mold at random empty position
func placePearlMold(gameMap [][]int, playerRow, playerCol int) {
	rand.Seed(time.Now().UnixNano())

	// Find all empty positions (avoid player, enemies, pearls, and existing pearl molds)
	var emptyPositions [][2]int
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == EMPTY && !(rowIdx == playerRow && colIdx == playerCol) {
				emptyPositions = append(emptyPositions, [2]int{rowIdx, colIdx})
			}
		}
	}

	// Place pearl mold at random empty position
	if len(emptyPositions) > 0 {
		pos := emptyPositions[rand.Intn(len(emptyPositions))]
		gameMap[pos[0]][pos[1]] = PEARL_MOLD
	}
}

// MovePearlMoldRandomly moves the pearl mold to a random empty position
func MovePearlMoldRandomly(gameMap [][]int) bool {
	rand.Seed(time.Now().UnixNano())

	// Find current pearl mold position
	var currentRow, currentCol int = -1, -1
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == PEARL_MOLD {
				currentRow, currentCol = rowIdx, colIdx
				break
			}
		}
		if currentRow != -1 {
			break
		}
	}

	if currentRow == -1 {
		return false // No pearl mold found
	}

	// Find all valid empty positions (value 0)
	var emptyPositions [][2]int
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == EMPTY {
				emptyPositions = append(emptyPositions, [2]int{rowIdx, colIdx})
			}
		}
	}

	if len(emptyPositions) == 0 {
		return false // No empty positions available
	}

	// Move to random empty position
	newPos := emptyPositions[rand.Intn(len(emptyPositions))]
	gameMap[currentRow][currentCol] = EMPTY
	gameMap[newPos[0]][newPos[1]] = PEARL_MOLD

	return true
}

// GetPearlMoldPosition returns the current position of the pearl mold
func GetPearlMoldPosition(gameMap [][]int) (int, int, bool) {
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == PEARL_MOLD {
				return rowIdx, colIdx, true
			}
		}
	}
	return -1, -1, false
}

// RepositionEnemies removes all existing enemies and places them in new random positions
func RepositionEnemies(gameMap [][]int, playerRow, playerCol, numEnemies int) {
	// First, remove all existing enemies
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == ENEMY {
				gameMap[rowIdx][colIdx] = EMPTY
			}
		}
	}
	
	// Then place enemies in new positions
	placeEnemies(gameMap, playerRow, playerCol, numEnemies)
}

// IsValidPosition checks if a position is within bounds
func IsValidPosition(row, col int, gameMap [][]int) bool {
	if row < 0 || row >= len(gameMap) {
		return false
	}
	return col >= 0 && col < len(gameMap[row])
}
