package multiplayer

import (
	"log"
)

// MovementResult represents the result of a movement calculation
type MovementResult struct {
	NewRow          int  `json:"new_row"`
	NewCol          int  `json:"new_col"`
	PreferredColumn int  `json:"preferred_column"`
	IsValid         bool `json:"is_valid"`
}

// MovementCalculator interface to avoid circular imports
type MovementCalculator interface {
	CalculateNewPosition(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int) (*MovementResult, error)
	CalculateNewPositionWithCount(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int, count int, hasExplicitCount bool) (*MovementResult, error)
}

// Global movement calculator instance (to be set by the game package)
var movementCalc MovementCalculator

// SetMovementCalculator sets the movement calculator implementation
func SetMovementCalculator(calc MovementCalculator) {
	movementCalc = calc
}

// ProcessMove processes a move for multiplayer and returns new position, preferred column, and score
func ProcessMove(gameState *GameState, currentRow, currentCol int, direction string, count int, hasExplicitCount bool, preferredColumn int) (int, int, int, int) {
	log.Printf("🎮 MULTIPLAYER BACKEND ProcessMove: direction=%s, count=%d, hasExplicitCount=%t, position=(%d,%d), preferredColumn=%d", 
		direction, count, hasExplicitCount, currentRow, currentCol, preferredColumn)
	
	// Get text grid and game map for movement calculation
	textGrid := gameState.GetTextGrid()
	gameMap := gameState.GetGameMap()
	
	// Use the same movement logic as single-player mode
	var movementResult *MovementResult
	var err error
	
	if count == 1 {
		// Single move - process normally (same logic as solo game)
		if direction == "file_end" || direction == "file_start" {
			// Use count-aware function for G commands even with count=1
			movementResult, err = movementCalc.CalculateNewPositionWithCount(
				direction,
				currentRow,
				currentCol,
				gameMap,
				textGrid,
				preferredColumn, // Use actual preferred column
				count,
				hasExplicitCount,
			)
		} else {
			// For regular movements, use standard function
			movementResult, err = movementCalc.CalculateNewPosition(
				direction,
				currentRow,
				currentCol,
				gameMap,
				textGrid,
				preferredColumn, // Use actual preferred column
			)
		}
	} else {
		// Multiplier move - same logic as solo game
		if direction == "file_end" || direction == "file_start" {
			// For G commands, use absolute positioning directly
			movementResult, err = movementCalc.CalculateNewPositionWithCount(
				direction,
				currentRow,
				currentCol,
				gameMap,
				textGrid,
				preferredColumn, // Use actual preferred column
				count,
				hasExplicitCount,
			)
		} else {
			// For other movements, iterate count times (CRITICAL FIX)
			log.Printf("🔄 MULTIPLAYER BACKEND: Iterating %s movement %d times", direction, count)
			tempRow := currentRow
			tempCol := currentCol
			tempPreferredColumn := preferredColumn
			var finalResult *MovementResult
			
			for i := 0; i < count; i++ {
				log.Printf("🔄 MULTIPLAYER BACKEND: Iteration %d/%d, current position=(%d,%d), preferredColumn=%d", i+1, count, tempRow, tempCol, tempPreferredColumn)
				tempResult, tempErr := movementCalc.CalculateNewPosition(
					direction,
					tempRow,
					tempCol,
					gameMap,
					textGrid,
					tempPreferredColumn, // Use actual preferred column
				)
				
				if tempErr != nil {
					err = tempErr
					break
				}
				
				// If movement is blocked, stop here
				if !tempResult.IsValid {
					log.Printf("🚫 MULTIPLAYER BACKEND: Movement blocked at iteration %d/%d", i+1, count)
					break
				}
				
				// Update temporary position and preferred column for next iteration
				tempRow = tempResult.NewRow
				tempCol = tempResult.NewCol
				tempPreferredColumn = tempResult.PreferredColumn
				finalResult = tempResult
				log.Printf("✅ MULTIPLAYER BACKEND: Iteration %d/%d successful, new position=(%d,%d), newPreferredColumn=%d", i+1, count, tempRow, tempCol, tempPreferredColumn)
			}
			
			if finalResult != nil {
				movementResult = finalResult
			} else {
				// No valid moves were made, create a blocked result
				movementResult = &MovementResult{
					NewRow:         currentRow,
					NewCol:         currentCol,
					PreferredColumn: preferredColumn, // Keep original preferred column
					IsValid:        false,
				}
			}
		}
	}
	
	if err != nil || !movementResult.IsValid {
		// Movement is invalid, return original position and preferred column
		return currentRow, currentCol, preferredColumn, 0
	}
	
	newRow := movementResult.NewRow
	newCol := movementResult.NewCol
	newPreferredColumn := movementResult.PreferredColumn
	
	// Check if pearl is collected
	score := 0
	if gameState.GetPearlPosition().Row == newRow && gameState.GetPearlPosition().Col == newCol {
		score = gameState.CollectPearl(newRow, newCol)
	}
	
	log.Printf("🎮 MULTIPLAYER BACKEND ProcessMove RESULT: (%d,%d) -> (%d,%d), preferredColumn: %d -> %d, score=%d", 
		currentRow, currentCol, newRow, newCol, preferredColumn, newPreferredColumn, score)
	
	return newRow, newCol, newPreferredColumn, score
}

// calculateMove calculates the new position based on vim movement (legacy simplified function)
func calculateMove(textGrid [][]string, currentRow, currentCol int, direction string, count int, hasExplicitCount bool) (int, int, int) {
	// This is a simplified version - you would use your existing movement logic here
	// For now, implementing basic movement
	
	newRow := currentRow
	newCol := currentCol
	preferredCol := currentCol
	
	switch direction {
	case "h": // left
		newCol = Max(0, currentCol-count)
	case "l": // right
		if currentRow < len(textGrid) {
			newCol = Min(len(textGrid[currentRow])-1, currentCol+count)
		}
	case "j": // down
		newRow = Min(len(textGrid)-1, currentRow+count)
		if newRow < len(textGrid) {
			newCol = Min(len(textGrid[newRow])-1, currentCol)
		}
	case "k": // up
		newRow = Max(0, currentRow-count)
		if newRow < len(textGrid) {
			newCol = Min(len(textGrid[newRow])-1, currentCol)
		}
	case "w": // word forward
		newRow, newCol = MoveWordForward(textGrid, currentRow, currentCol, count)
	case "b": // word backward
		newRow, newCol = MoveWordBackward(textGrid, currentRow, currentCol, count)
	case "e": // end of word
		newRow, newCol = MoveEndOfWord(textGrid, currentRow, currentCol, count)
	case "0": // beginning of line
		newCol = 0
	case "$": // end of line
		if currentRow < len(textGrid) {
			newCol = Max(0, len(textGrid[currentRow])-1)
		}
	case "^": // first non-whitespace
		if currentRow < len(textGrid) {
			newCol = FindFirstNonWhitespace(textGrid[currentRow])
		}
	}
	
	// Ensure bounds
	if newRow < 0 {
		newRow = 0
	}
	if newRow >= len(textGrid) {
		newRow = len(textGrid) - 1
	}
	if newCol < 0 {
		newCol = 0
	}
	if newRow < len(textGrid) && newCol >= len(textGrid[newRow]) {
		newCol = Max(0, len(textGrid[newRow])-1)
	}
	
	return newRow, newCol, preferredCol
}