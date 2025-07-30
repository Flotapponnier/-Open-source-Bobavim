package multiplayer

// Max returns the maximum of two integers
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Min returns the minimum of two integers
func Min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// MoveWordForward moves forward by word count times
func MoveWordForward(textGrid [][]string, row, col int, count int) (int, int) {
	newRow, newCol := row, col
	
	for i := 0; i < count; i++ {
		// Simple implementation - move to next word
		for newCol < len(textGrid[newRow])-1 {
			newCol++
			if newCol < len(textGrid[newRow]) && textGrid[newRow][newCol] != " " {
				break
			}
		}
		
		// If at end of line, move to next line
		if newCol >= len(textGrid[newRow])-1 && newRow < len(textGrid)-1 {
			newRow++
			newCol = 0
		}
	}
	
	return newRow, newCol
}

// MoveWordBackward moves backward by word count times
func MoveWordBackward(textGrid [][]string, row, col int, count int) (int, int) {
	newRow, newCol := row, col
	
	for i := 0; i < count; i++ {
		// Simple implementation - move to previous word
		for newCol > 0 {
			newCol--
			if newCol >= 0 && textGrid[newRow][newCol] != " " {
				break
			}
		}
		
		// If at beginning of line, move to previous line
		if newCol <= 0 && newRow > 0 {
			newRow--
			newCol = len(textGrid[newRow]) - 1
		}
	}
	
	return newRow, newCol
}

// MoveEndOfWord moves to end of word count times
func MoveEndOfWord(textGrid [][]string, row, col int, count int) (int, int) {
	newRow, newCol := row, col
	
	for i := 0; i < count; i++ {
		// Simple implementation - move to end of current word
		for newCol < len(textGrid[newRow])-1 {
			newCol++
			if newCol+1 < len(textGrid[newRow]) && textGrid[newRow][newCol+1] == " " {
				break
			}
		}
		
		// If at end of line, move to next line
		if newCol >= len(textGrid[newRow])-1 && newRow < len(textGrid)-1 {
			newRow++
			newCol = 0
		}
	}
	
	return newRow, newCol
}

// FindFirstNonWhitespace finds the first non-whitespace character in a line
func FindFirstNonWhitespace(line []string) int {
	for i, char := range line {
		if char != " " && char != "\t" {
			return i
		}
	}
	return 0
}