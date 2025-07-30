package movement

import "boba-vim/internal/utils"

// HandleBasicMovement handles basic directional movements (h, j, k, l)
func HandleBasicMovement(direction string, currentRow, currentCol, preferredColumn int, gameMap [][]int) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := preferredColumn

	switch direction {
	case "left":
		// h: move left one character
		if currentCol > 0 {
			newCol = currentCol - 1
		}
		// Update preferred column to new position
		newPreferredColumn = newCol
	case "right":
		// l: move right one character
		if currentCol < len(gameMap[currentRow])-1 {
			newCol = currentCol + 1
		}
		// Update preferred column to new position
		newPreferredColumn = newCol
	case "up":
		// k: move up one line
		if currentRow > 0 {
			newRow = currentRow - 1
			// Use preferred column, but clamp to target line length
			newCol = utils.ClampToRow(preferredColumn, newRow, gameMap)
		}
		// Don't update preferred column for vertical movements
	case "down":
		// j: move down one line
		if currentRow < len(gameMap)-1 {
			newRow = currentRow + 1
			// Use preferred column, but clamp to target line length
			newCol = utils.ClampToRow(preferredColumn, newRow, gameMap)
		}
		// Don't update preferred column for vertical movements
	}

	return newRow, newCol, newPreferredColumn
}

// HandleLineMovement handles line-based movements ($, 0, ^, g_)
func HandleLineMovement(direction string, currentRow, currentCol int, gameMap [][]int, textGrid [][]string) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "line_end":
		// $: move to end of line
		if len(gameMap[currentRow]) > 0 {
			newCol = len(gameMap[currentRow]) - 1
		}
		newPreferredColumn = newCol
	case "line_start":
		// 0: move to start of line
		newCol = 0
		newPreferredColumn = newCol
	case "line_first_non_blank":
		// ^: move to first non-blank character
		newCol = findFirstNonBlank(currentRow, textGrid)
		newPreferredColumn = newCol
	case "line_last_non_blank":
		// g_: move to last non-blank character
		newCol = findLastNonBlank(currentRow, textGrid)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// HandleFileMovement handles file-wide movements (gg, G)
func HandleFileMovement(direction string, currentRow, currentCol, preferredColumn int, gameMap [][]int) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "file_start":
		newRow = 0
		newCol = 0
		newPreferredColumn = newCol
	case "file_end":
		newRow = len(gameMap) - 1
		// Preserve the current column position, but clamp to last line's length
		newCol = utils.ClampToRow(currentCol, newRow, gameMap)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// HandleFileMovementWithCount handles file-wide movements with count (e.g., 5G goes to line 5)
func HandleFileMovementWithCount(direction string, currentRow, currentCol, preferredColumn int, gameMap [][]int, count int, hasExplicitCount bool) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "file_start":
		newRow = 0
		newCol = 0
		newPreferredColumn = newCol
	case "file_end":
		if hasExplicitCount {
			// With explicit count, G goes to absolute line number (count - 1 since we're 0-indexed)
			newRow = count - 1
			// Clamp to valid range
			if newRow >= len(gameMap) {
				newRow = len(gameMap) - 1
			}
			if newRow < 0 {
				newRow = 0
			}
		} else {
			// Without explicit count, G goes to last line
			newRow = len(gameMap) - 1
		}
		// Preserve the current column position, but clamp to target line's length
		newCol = utils.ClampToRow(currentCol, newRow, gameMap)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// HandleScreenMovement handles screen-relative movements (H, M, L)
func HandleScreenMovement(direction string, currentRow, currentCol, preferredColumn int, gameMap [][]int) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := preferredColumn

	switch direction {
	case "screen_top":
		newRow = 0
		newCol = utils.ClampToRow(preferredColumn, newRow, gameMap)
	case "screen_middle":
		newRow = len(gameMap) / 2
		newCol = utils.ClampToRow(preferredColumn, newRow, gameMap)
	case "screen_bottom":
		newRow = len(gameMap) - 1
		newCol = utils.ClampToRow(preferredColumn, newRow, gameMap)
	}

	return newRow, newCol, newPreferredColumn
}

// findFirstNonBlank finds first non-blank character in the row
func findFirstNonBlank(row int, textGrid [][]string) int {
	if row < 0 || row >= len(textGrid) {
		return 0
	}

	for col := 0; col < len(textGrid[row]); col++ {
		char := textGrid[row][col]
		if !utils.IsSpace(char) && char != "" {
			return col
		}
	}

	return 0
}

// findLastNonBlank finds last non-blank character in the row
func findLastNonBlank(row int, textGrid [][]string) int {
	if row < 0 || row >= len(textGrid) {
		return 0
	}

	if len(textGrid[row]) == 0 {
		return 0
	}

	for col := len(textGrid[row]) - 1; col >= 0; col-- {
		char := textGrid[row][col]
		if !utils.IsSpace(char) && char != "" {
			return col
		}
	}

	return 0
}
