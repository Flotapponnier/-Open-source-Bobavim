package multiplayer

import (
	"boba-vim/internal/constant"
	"math/rand"
	"time"
)

// GetPearlPosition returns the pearl's position
func (gs *GameState) GetPearlPosition() Position {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	return Position{Row: gs.PearlRow, Col: gs.PearlCol}
}

// CollectPearl handles pearl collection and returns the score
func (gs *GameState) CollectPearl(playerRow, playerCol int) int {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	// Check if player is at pearl position
	if playerRow != gs.PearlRow || playerCol != gs.PearlCol {
		return 0
	}
	
	// Calculate score based on the vim motion scoring system
	pearlScore := calculatePearlScore(gs.TextGrid, gs.PearlRow, gs.PearlCol)
	
	// Clear current pearl
	gs.GameMap[gs.PearlRow][gs.PearlCol] = EMPTY
	
	// Place new pearl, avoiding both players
	gs.PearlRow, gs.PearlCol = gs.placeNewPearl()
	
	return pearlScore
}

// placeNewPearl places a new pearl avoiding both players
func (gs *GameState) placeNewPearl() (int, int) {
	// Try to place pearl avoiding both players
	for attempts := 0; attempts < 100; attempts++ {
		row, col := placePearlInMap(gs.GameMap, -1, -1)
		
		// Check if it's not at either player's position
		if (row != gs.Player1Row || col != gs.Player1Col) && 
		   (row != gs.Player2Row || col != gs.Player2Col) {
			return row, col
		}
	}
	
	// Fallback: place anywhere
	return placePearlInMap(gs.GameMap, -1, -1)
}

// calculatePearlScore calculates score based on vim motion scoring system
func calculatePearlScore(textGrid [][]string, row, col int) int {
	if row < 0 || row >= len(textGrid) {
		return 100 // Default score
	}
	
	// Check if the column is valid for this specific row
	if col < 0 || col >= len(textGrid[row]) {
		return 100 // Default score
	}
	
	// Use the character at the position to determine score
	char := textGrid[row][col]
	
	// Use the vim motion scoring system for character-based scoring
	vimScores := constant.GetVimMotionScores()
	return vimScores.GetMotionScore(char)
}

// placePearlInMap places a pearl at random empty position
func placePearlInMap(gameMap [][]int, excludeRow, excludeCol int) (int, int) {
	rand.Seed(time.Now().UnixNano())
	
	// Find all empty positions
	var emptyPositions [][2]int
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if gameMap[rowIdx][colIdx] == EMPTY && !(rowIdx == excludeRow && colIdx == excludeCol) {
				emptyPositions = append(emptyPositions, [2]int{rowIdx, colIdx})
			}
		}
	}
	
	// Place pearl at random empty position
	if len(emptyPositions) > 0 {
		pos := emptyPositions[rand.Intn(len(emptyPositions))]
		gameMap[pos[0]][pos[1]] = PEARL
		return pos[0], pos[1]
	}
	
	// Fallback: find a safe position
	for rowIdx := 0; rowIdx < len(gameMap); rowIdx++ {
		for colIdx := 0; colIdx < len(gameMap[rowIdx]); colIdx++ {
			if !(rowIdx == excludeRow && colIdx == excludeCol) {
				gameMap[rowIdx][colIdx] = PEARL
				return rowIdx, colIdx
			}
		}
	}
	
	// Ultimate fallback: place at (0,0) if safe
	if len(gameMap) > 0 && len(gameMap[0]) > 0 {
		gameMap[0][0] = PEARL
		return 0, 0
	}
	
	return 0, 0
}