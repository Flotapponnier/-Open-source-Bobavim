package game

import (
	"boba-vim/internal/game/multiplayer"
	"log"
)

// Re-export types from multiplayer package
type GameState = multiplayer.GameState
type Position = multiplayer.Position

// Re-export functions from multiplayer package
var NewGameState = multiplayer.NewGameState
var ProcessMove = multiplayer.ProcessMove

// Movement calculator implementation for multiplayer
type gameMovementCalculator struct{}

func (gmc *gameMovementCalculator) CalculateNewPosition(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int) (*multiplayer.MovementResult, error) {
	result, err := CalculateNewPosition(direction, currentRow, currentCol, gameMap, textGrid, preferredColumn)
	if err != nil {
		return nil, err
	}
	return &multiplayer.MovementResult{
		NewRow:          result.NewRow,
		NewCol:          result.NewCol,
		PreferredColumn: result.PreferredColumn,
		IsValid:         result.IsValid,
	}, nil
}

func (gmc *gameMovementCalculator) CalculateNewPositionWithCount(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int, count int, hasExplicitCount bool) (*multiplayer.MovementResult, error) {
	result, err := CalculateNewPositionWithCount(direction, currentRow, currentCol, gameMap, textGrid, preferredColumn, count, hasExplicitCount)
	if err != nil {
		return nil, err
	}
	return &multiplayer.MovementResult{
		NewRow:          result.NewRow,
		NewCol:          result.NewCol,
		PreferredColumn: result.PreferredColumn,
		IsValid:         result.IsValid,
	}, nil
}

// Initialize the movement calculator
func init() {
	log.Printf("🔧 Initializing multiplayer movement calculator")
	multiplayer.SetMovementCalculator(&gameMovementCalculator{})
}