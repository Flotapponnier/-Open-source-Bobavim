package utils

// IsWordChar determines if a character is a word character
func IsWordChar(char string) bool {
	if len(char) == 0 {
		return false
	}
	c := char[0]
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_'
}

// IsSpace determines if a character is whitespace
func IsSpace(char string) bool {
	return char == " " || char == "\t"
}

// IsLineEmpty checks if a line is completely empty (no characters at all) or contains only whitespace
func IsLineEmpty(line []string) bool {
	if len(line) == 0 {
		return true
	}
	// Check if line contains only whitespace characters
	for _, char := range line {
		if char != " " && char != "\t" {
			return false
		}
	}
	return true
}

// IsPunctuation determines if a character is punctuation
func IsPunctuation(char string) bool {
	if len(char) == 0 {
		return false
	}
	return !IsWordChar(char) && !IsSpace(char)
}

// ClampToRow clamps the column to valid range for the given row
func ClampToRow(preferredCol, row int, gameMap [][]int) int {
	if row < 0 || row >= len(gameMap) {
		return preferredCol
	}

	maxCol := len(gameMap[row]) - 1
	if preferredCol < 0 {
		return 0
	}
	if preferredCol > maxCol {
		return maxCol
	}
	return preferredCol
}
