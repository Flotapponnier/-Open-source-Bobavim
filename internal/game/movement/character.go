package movement

import (
	"boba-vim/internal/utils"
)

// CharSearchState stores the last character search operation for ; and , repetition
type CharSearchState struct {
	Command string // "f", "F", "t", "T"
	Char    string // The character that was searched for
}

// LastCharSearch global state for character search repetition
var LastCharSearch CharSearchState

// HandleCharacterSearch handles character search movements (f, F, t, T, ;, ,)
func HandleCharacterSearch(direction string, currentRow, currentCol int, textGrid [][]string) (int, int, int) {
	// Comprehensive debug logging
	utils.Debug("HandleCharacterSearch called with direction='%s', row=%d, col=%d, textGrid_len=%d", 
		direction, currentRow, currentCol, len(textGrid))
	
	// Handle empty or invalid direction strings
	if direction == "" {
		utils.Debug("[DEBUG] Empty direction string, returning early")
		return currentRow, currentCol, 0
	}
	
	// Handle invalid textGrid
	if textGrid == nil || len(textGrid) == 0 {
		utils.Debug("[DEBUG] Invalid textGrid (nil or empty), returning early")
		return currentRow, currentCol, 0
	}
	
	// Additional safety check for row bounds
	if currentRow < 0 || currentRow >= len(textGrid) {
		utils.Debug("[DEBUG] Row out of bounds: %d (textGrid length: %d)", currentRow, len(textGrid))
		return currentRow, currentCol, 0
	}
	
	// Check if current row is empty
	if len(textGrid[currentRow]) == 0 {
		utils.Debug("[DEBUG] Current row %d is empty", currentRow)
		return currentRow, currentCol, 0
	}
	
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "repeat_char_search_same":
		if LastCharSearch.Command == "" {
			return currentRow, currentCol, newPreferredColumn
		}
		switch LastCharSearch.Command {
		case "f":
			newRow, newCol = FindCharForward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "F":
			newRow, newCol = FindCharBackward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "t":
			newRow, newCol = TillCharForward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "T":
			newRow, newCol = TillCharBackward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		}
		newPreferredColumn = newCol
	case "repeat_char_search_opposite":
		if LastCharSearch.Command == "" {
			return currentRow, currentCol, newPreferredColumn
		}
		switch LastCharSearch.Command {
		case "f":
			newRow, newCol = FindCharBackward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "F":
			newRow, newCol = FindCharForward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "t":
			newRow, newCol = TillCharBackward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		case "T":
			newRow, newCol = TillCharForward(currentRow, currentCol, textGrid, LastCharSearch.Char)
		}
		newPreferredColumn = newCol
	default:
		utils.Debug("[DEBUG] Processing direction in default case: '%s' (len=%d)", direction, len(direction))
		
		// Handle parameterized character searches with strict bounds checking
		if len(direction) >= 19 && direction[:17] == "find_char_forward" {
			utils.Debug("[DEBUG] Checking find_char_forward pattern")
			if len(direction) == 19 && direction[17] == '_' {
				targetChar := string(direction[18])
				utils.Debug("[DEBUG] find_char_forward target: '%s' (ASCII %d)", targetChar, direction[18])
				LastCharSearch.Command = "f"
				LastCharSearch.Char = targetChar
				newRow, newCol = FindCharForward(currentRow, currentCol, textGrid, targetChar)
				newPreferredColumn = newCol
			} else {
				utils.Debug("[DEBUG] find_char_forward validation failed: len=%d, expected=19", len(direction))
			}
		} else if len(direction) >= 20 && direction[:18] == "find_char_backward" {
			utils.Debug("[DEBUG] Checking find_char_backward pattern")
			if len(direction) == 20 && direction[18] == '_' {
				targetChar := string(direction[19])
				utils.Debug("[DEBUG] find_char_backward target: '%s' (ASCII %d)", targetChar, direction[19])
				LastCharSearch.Command = "F"
				LastCharSearch.Char = targetChar
				newRow, newCol = FindCharBackward(currentRow, currentCol, textGrid, targetChar)
				newPreferredColumn = newCol
			} else {
				utils.Debug("[DEBUG] find_char_backward validation failed: len=%d, expected=20", len(direction))
			}
		} else if len(direction) >= 19 && direction[:17] == "till_char_forward" {
			utils.Debug("[DEBUG] Checking till_char_forward pattern")
			if len(direction) == 19 && direction[17] == '_' {
				targetChar := string(direction[18])
				utils.Debug("[DEBUG] till_char_forward target: '%s' (ASCII %d)", targetChar, direction[18])
				LastCharSearch.Command = "t"
				LastCharSearch.Char = targetChar
				newRow, newCol = TillCharForward(currentRow, currentCol, textGrid, targetChar)
				newPreferredColumn = newCol
			} else {
				utils.Debug("[DEBUG] till_char_forward validation failed: len=%d, expected=19", len(direction))
			}
		} else if len(direction) >= 20 && direction[:18] == "till_char_backward" {
			utils.Debug("[DEBUG] Checking till_char_backward pattern")
			if len(direction) == 20 && direction[18] == '_' {
				targetChar := string(direction[19])
				utils.Debug("[DEBUG] till_char_backward target: '%s' (ASCII %d)", targetChar, direction[19])
				LastCharSearch.Command = "T"
				LastCharSearch.Char = targetChar
				newRow, newCol = TillCharBackward(currentRow, currentCol, textGrid, targetChar)
				newPreferredColumn = newCol
			} else {
				utils.Debug("[DEBUG] till_char_backward validation failed: len=%d, expected=20", len(direction))
			}
		} else {
			utils.Debug("[DEBUG] No character search pattern matched for direction: '%s'", direction)
		}
	}

	return newRow, newCol, newPreferredColumn
}

// FindCharForward finds character forward in current line
func FindCharForward(row, col int, textGrid [][]string, targetChar string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	// Additional bounds check for the current row
	if len(textGrid[row]) == 0 {
		return row, col
	}

	for searchCol := col + 1; searchCol < len(textGrid[row]); searchCol++ {
		if searchCol >= 0 && searchCol < len(textGrid[row]) && textGrid[row][searchCol] == targetChar {
			return row, searchCol
		}
	}

	return row, col
}

// FindCharBackward finds character backward in current line
func FindCharBackward(row, col int, textGrid [][]string, targetChar string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	// Additional bounds check for the current row
	if len(textGrid[row]) == 0 {
		return row, col
	}

	for searchCol := col - 1; searchCol >= 0; searchCol-- {
		if searchCol >= 0 && searchCol < len(textGrid[row]) && textGrid[row][searchCol] == targetChar {
			return row, searchCol
		}
	}

	return row, col
}

// TillCharForward moves till character forward in current line
func TillCharForward(row, col int, textGrid [][]string, targetChar string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	// Additional bounds check for the current row
	if len(textGrid[row]) == 0 {
		return row, col
	}

	for searchCol := col + 1; searchCol < len(textGrid[row]); searchCol++ {
		if searchCol >= 0 && searchCol < len(textGrid[row]) && textGrid[row][searchCol] == targetChar {
			return row, searchCol - 1
		}
	}

	return row, col
}

// TillCharBackward moves till character backward in current line
func TillCharBackward(row, col int, textGrid [][]string, targetChar string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	// Additional bounds check for the current row
	if len(textGrid[row]) == 0 {
		return row, col
	}

	for searchCol := col - 1; searchCol >= 0; searchCol-- {
		if searchCol >= 0 && searchCol < len(textGrid[row]) && textGrid[row][searchCol] == targetChar {
			return row, searchCol + 1
		}
	}

	return row, col
}
