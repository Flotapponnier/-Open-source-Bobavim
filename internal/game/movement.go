package game

import (
	"boba-vim/internal/constant"
	"boba-vim/internal/game/movement"
	"fmt"
)

// MovementKeys alias for backward compatibility
var MovementKeys = constant.MOVEMENT_KEYS

// ValidMovementKeys alias for backward compatibility
var ValidMovementKeys = constant.VALID_MOVEMENT_KEYS

// LastCharSearch stores the last character search operation for ; and , repetition
var LastCharSearch = &movement.LastCharSearch

// MovementResult represents the result of a movement calculation
type MovementResult struct {
	NewRow          int  `json:"new_row"`
	NewCol          int  `json:"new_col"`
	PreferredColumn int  `json:"preferred_column"`
	IsValid         bool `json:"is_valid"`
}

// CalculateNewPositionWithCount calculates the new position based on vim-style movement with count support
func CalculateNewPositionWithCount(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int, count int, hasExplicitCount bool) (*MovementResult, error) {
	if !isValidDirection(direction) {
		return nil, fmt.Errorf("invalid direction: %s", direction)
	}

	newRow, newCol := currentRow, currentCol
	newPreferredColumn := preferredColumn

	// Route to appropriate movement handler
	switch {
	case direction == "left" || direction == "right" || direction == "up" || direction == "down":
		newRow, newCol, newPreferredColumn = movement.HandleBasicMovement(direction, currentRow, currentCol, preferredColumn, gameMap)

	case direction == "line_end" || direction == "line_start" || direction == "line_first_non_blank" || direction == "line_last_non_blank":
		newRow, newCol, newPreferredColumn = movement.HandleLineMovement(direction, currentRow, currentCol, gameMap, textGrid)

	case direction == "file_start" || direction == "file_end":
		// Use the count-aware function for file movements
		newRow, newCol, newPreferredColumn = movement.HandleFileMovementWithCount(direction, currentRow, currentCol, preferredColumn, gameMap, count, hasExplicitCount)

	case direction == "screen_top" || direction == "screen_middle" || direction == "screen_bottom":
		newRow, newCol, newPreferredColumn = movement.HandleScreenMovement(direction, currentRow, currentCol, preferredColumn, gameMap)

	case direction == "word_forward" || direction == "word_forward_space" || direction == "word_backward" || direction == "word_backward_space" || direction == "word_end" || direction == "word_end_space" || direction == "word_end_prev" || direction == "word_end_prev_space":
		newRow, newCol, newPreferredColumn = movement.HandleWordMovement(direction, currentRow, currentCol, textGrid)

	case direction == "paragraph_prev" || direction == "paragraph_next":
		newRow, newCol, newPreferredColumn = movement.HandleParagraphMovement(direction, currentRow, currentCol, textGrid)

	case direction == "sentence_prev" || direction == "sentence_next":
		newRow, newCol, newPreferredColumn = movement.HandleSentenceMovement(direction, currentRow, currentCol, textGrid)

	case direction == "repeat_char_search_same" || direction == "repeat_char_search_opposite" || len(direction) > 17 && (direction[:17] == "find_char_forward" || direction[:17] == "till_char_forward") || len(direction) > 18 && (direction[:18] == "find_char_backward" || direction[:18] == "till_char_backward"):
		newRow, newCol, newPreferredColumn = movement.HandleCharacterSearch(direction, currentRow, currentCol, textGrid)

	case direction == "match_bracket":
		newRow, newCol, newPreferredColumn = movement.HandleBracketMatching(currentRow, currentCol, textGrid)

	default:
		return nil, fmt.Errorf("unknown direction: %s", direction)
	}

	isValid := IsValidPosition(newRow, newCol, gameMap)

	// Check if position contains an enemy (block movement)
	if isValid && gameMap[newRow][newCol] == constant.ENEMY {
		isValid = false
	}

	// Allow paragraph movements to stay at same position (like when at first/last paragraph)
	if isValid && newRow == currentRow && newCol == currentCol {
		// Don't invalidate paragraph movements that stay at same position
		if direction != "paragraph_prev" && direction != "paragraph_next" {
			isValid = false
		}
	}

	return &MovementResult{
		NewRow:          newRow,
		NewCol:          newCol,
		PreferredColumn: newPreferredColumn,
		IsValid:         isValid,
	}, nil
}

// CalculateNewPosition calculates the new position based on vim-style movement
func CalculateNewPosition(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string, preferredColumn int) (*MovementResult, error) {
	if !isValidDirection(direction) {
		return nil, fmt.Errorf("invalid direction: %s", direction)
	}

	newRow, newCol := currentRow, currentCol
	newPreferredColumn := preferredColumn

	// Route to appropriate movement handler
	switch {
	case direction == "left" || direction == "right" || direction == "up" || direction == "down":
		newRow, newCol, newPreferredColumn = movement.HandleBasicMovement(direction, currentRow, currentCol, preferredColumn, gameMap)

	case direction == "line_end" || direction == "line_start" || direction == "line_first_non_blank" || direction == "line_last_non_blank":
		newRow, newCol, newPreferredColumn = movement.HandleLineMovement(direction, currentRow, currentCol, gameMap, textGrid)

	case direction == "file_start" || direction == "file_end":
		newRow, newCol, newPreferredColumn = movement.HandleFileMovement(direction, currentRow, currentCol, preferredColumn, gameMap)

	case direction == "screen_top" || direction == "screen_middle" || direction == "screen_bottom":
		newRow, newCol, newPreferredColumn = movement.HandleScreenMovement(direction, currentRow, currentCol, preferredColumn, gameMap)

	case direction == "word_forward" || direction == "word_forward_space" || direction == "word_backward" || direction == "word_backward_space" || direction == "word_end" || direction == "word_end_space" || direction == "word_end_prev" || direction == "word_end_prev_space":
		newRow, newCol, newPreferredColumn = movement.HandleWordMovement(direction, currentRow, currentCol, textGrid)

	case direction == "paragraph_prev" || direction == "paragraph_next":
		newRow, newCol, newPreferredColumn = movement.HandleParagraphMovement(direction, currentRow, currentCol, textGrid)

	case direction == "sentence_prev" || direction == "sentence_next":
		newRow, newCol, newPreferredColumn = movement.HandleSentenceMovement(direction, currentRow, currentCol, textGrid)

	case direction == "repeat_char_search_same" || direction == "repeat_char_search_opposite" || len(direction) > 17 && (direction[:17] == "find_char_forward" || direction[:17] == "till_char_forward") || len(direction) > 18 && (direction[:18] == "find_char_backward" || direction[:18] == "till_char_backward"):
		newRow, newCol, newPreferredColumn = movement.HandleCharacterSearch(direction, currentRow, currentCol, textGrid)

	case direction == "match_bracket":
		newRow, newCol, newPreferredColumn = movement.HandleBracketMatching(currentRow, currentCol, textGrid)

	default:
		return nil, fmt.Errorf("unknown direction: %s", direction)
	}

	isValid := IsValidPosition(newRow, newCol, gameMap)

	// Check if position contains an enemy (block movement)
	if isValid && gameMap[newRow][newCol] == constant.ENEMY {
		isValid = false
	}

	// Allow paragraph movements to stay at same position (like when at first/last paragraph)
	if isValid && newRow == currentRow && newCol == currentCol {
		// Don't invalidate paragraph movements that stay at same position
		if direction != "paragraph_prev" && direction != "paragraph_next" {
			isValid = false
		}
	}

	return &MovementResult{
		NewRow:          newRow,
		NewCol:          newCol,
		PreferredColumn: newPreferredColumn,
		IsValid:         isValid,
	}, nil
}

// isValidDirection checks if the direction is valid
func isValidDirection(direction string) bool {
	// Check standard directions first
	if constant.VALID_DIRECTIONS[direction] {
		return true
	}

	// Check character search directions with character parameter
	if len(direction) == 19 && direction[:17] == "find_char_forward" && direction[17] == '_' {
		return true
	}
	if len(direction) == 20 && direction[:18] == "find_char_backward" && direction[18] == '_' {
		return true
	}
	if len(direction) == 19 && direction[:17] == "till_char_forward" && direction[17] == '_' {
		return true
	}
	if len(direction) == 20 && direction[:18] == "till_char_backward" && direction[18] == '_' {
		return true
	}

	return false
}

// GetAvailableMovements returns all available movement keys
func GetAvailableMovements() []map[string]interface{} {
	var movements []map[string]interface{}

	for key, info := range constant.MOVEMENT_KEYS {
		movement := map[string]interface{}{
			"key":         key,
			"direction":   info["direction"],
			"description": info["description"],
		}
		movements = append(movements, movement)
	}

	return movements
}
