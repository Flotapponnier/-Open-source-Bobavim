package movement

// HandleBracketMatching handles bracket matching movement (%)
func HandleBracketMatching(currentRow, currentCol int, textGrid [][]string) (int, int, int) {
	newRow, newCol := FindMatchingBracket(currentRow, currentCol, textGrid)
	newPreferredColumn := newCol
	return newRow, newCol, newPreferredColumn
}

// FindMatchingBracket finds matching bracket
func FindMatchingBracket(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) || col < 0 || col >= len(textGrid[row]) {
		return row, col
	}

	currentChar := textGrid[row][col]
	var targetChar string
	var searchForward bool

	switch currentChar {
	case "(":
		targetChar = ")"
		searchForward = true
	case ")":
		targetChar = "("
		searchForward = false
	case "{":
		targetChar = "}"
		searchForward = true
	case "}":
		targetChar = "{"
		searchForward = false
	case "[":
		targetChar = "]"
		searchForward = true
	case "]":
		targetChar = "["
		searchForward = false
	default:
		return row, col
	}

	if searchForward {
		return findMatchingBracketForward(row, col, currentChar, targetChar, textGrid)
	} else {
		return findMatchingBracketBackward(row, col, currentChar, targetChar, textGrid)
	}
}

// findMatchingBracketForward finds matching bracket in forward direction
func findMatchingBracketForward(startRow, startCol int, openBracket, closeBracket string, textGrid [][]string) (int, int) {
	nestLevel := 1
	currentRow := startRow
	currentCol := startCol + 1

	for currentRow < len(textGrid) {
		for currentCol < len(textGrid[currentRow]) {
			char := textGrid[currentRow][currentCol]

			if char == openBracket {
				nestLevel++
			} else if char == closeBracket {
				nestLevel--
				if nestLevel == 0 {
					return currentRow, currentCol
				}
			}

			currentCol++
		}
		currentRow++
		currentCol = 0
	}

	return startRow, startCol
}

// findMatchingBracketBackward finds matching bracket in backward direction
func findMatchingBracketBackward(startRow, startCol int, closeBracket, openBracket string, textGrid [][]string) (int, int) {
	nestLevel := 1
	currentRow := startRow
	currentCol := startCol - 1

	for currentRow >= 0 {
		for currentCol >= 0 {
			char := textGrid[currentRow][currentCol]

			if char == closeBracket {
				nestLevel++
			} else if char == openBracket {
				nestLevel--
				if nestLevel == 0 {
					return currentRow, currentCol
				}
			}

			currentCol--
		}
		currentRow--
		if currentRow >= 0 && currentRow < len(textGrid) {
			currentCol = len(textGrid[currentRow]) - 1
		}
	}

	return startRow, startCol
}
