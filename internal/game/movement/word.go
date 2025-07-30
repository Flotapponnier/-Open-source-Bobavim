package movement

import "boba-vim/internal/utils"

// HandleWordMovement handles word-based movements (w, W, b, B, e, E, ge, gE)
func HandleWordMovement(direction string, currentRow, currentCol int, textGrid [][]string) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "word_forward", "word_forward_space":
		newRow, newCol = FindWordForward(currentRow, currentCol, textGrid, direction == "word_forward_space")
		newPreferredColumn = newCol
	case "word_backward", "word_backward_space":
		newRow, newCol = FindWordBackward(currentRow, currentCol, textGrid, direction == "word_backward_space")
		newPreferredColumn = newCol
	case "word_end":
		newRow, newCol = FindWordEnd(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	case "word_end_space":
		newRow, newCol = FindWordEndSpace(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	case "word_end_prev":
		newRow, newCol = FindWordEndPrev(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	case "word_end_prev_space":
		newRow, newCol = FindWordEndPrevSpace(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// FindWordForward finds next word forward
func FindWordForward(row, col int, textGrid [][]string, spaceSeparated bool) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	if spaceSeparated {
		// For W: skip current WORD (space-separated)
		for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
			currentChar := textGrid[currentRow][currentCol]
			if utils.IsSpace(currentChar) {
				break
			}
			currentCol++
		}
	} else {
		// For w: vim-like word boundaries
		if currentCol < len(textGrid[currentRow]) {
			currentChar := textGrid[currentRow][currentCol]

			if utils.IsWordChar(currentChar) {
				// Skip current word (alphanumeric + underscore)
				for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					char := textGrid[currentRow][currentCol]
					if !utils.IsWordChar(char) {
						break
					}
					currentCol++
				}
			} else if utils.IsPunctuation(currentChar) {
				// Skip current punctuation character (vim treats each punctuation as separate word)
				currentCol++
			} else if utils.IsSpace(currentChar) {
				// Already on space - don't skip, go directly to whitespace skipping logic
				// This ensures we skip all spaces and find the next word
			}
		}
	}

	// Skip whitespace
	for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]
		if !utils.IsSpace(currentChar) {
			break
		}
		currentCol++
	}

	// If we reached end of line, go to next line
	if currentRow < len(textGrid) && currentCol >= len(textGrid[currentRow]) {
		currentRow++
		currentCol = 0
		// Skip leading whitespace on new line
		for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
			currentChar := textGrid[currentRow][currentCol]
			if !utils.IsSpace(currentChar) {
				break
			}
			currentCol++
		}
	}

	// Ensure bounds
	if currentRow >= len(textGrid) {
		currentRow = len(textGrid) - 1
		currentCol = len(textGrid[currentRow]) - 1
	} else if currentRow >= 0 && currentCol >= len(textGrid[currentRow]) {
		currentCol = len(textGrid[currentRow]) - 1
	}

	return currentRow, currentCol
}

// FindWordBackward finds previous word backward
func FindWordBackward(row, col int, textGrid [][]string, spaceSeparated bool) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	// Move one position back to start
	currentCol--
	if currentCol < 0 {
		if currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		} else {
			return 0, 0 // At beginning
		}
	}

	if currentRow < 0 || currentCol < 0 {
		return 0, 0
	}

	// Skip whitespace backwards
	for currentRow >= 0 && currentCol >= 0 {
		if currentRow >= len(textGrid) || currentCol >= len(textGrid[currentRow]) {
			break
		}
		currentChar := textGrid[currentRow][currentCol]
		if !utils.IsSpace(currentChar) {
			break
		}
		currentCol--
		if currentCol < 0 && currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		}
	}

	// Find beginning of current word
	if currentRow >= 0 && currentCol >= 0 && currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]

		if spaceSeparated {
			// For B: move to beginning of WORD (space-separated)
			for currentCol > 0 {
				prevChar := textGrid[currentRow][currentCol-1]
				if utils.IsSpace(prevChar) {
					break
				}
				currentCol--
			}
		} else {
			// For b: vim-like word boundaries
			if utils.IsWordChar(currentChar) {
				// Move to beginning of word
				for currentCol > 0 {
					prevChar := textGrid[currentRow][currentCol-1]
					if !utils.IsWordChar(prevChar) {
						break
					}
					currentCol--
				}
			} else if utils.IsPunctuation(currentChar) {
				// Each punctuation is its own word, already at beginning
			}
		}
	}

	// Ensure bounds
	if currentRow < 0 {
		currentRow = 0
		currentCol = 0
	} else if currentCol < 0 {
		currentCol = 0
	}

	return currentRow, currentCol
}

// FindWordEnd finds end of word
func FindWordEnd(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	// Check if we're currently on whitespace - if so, skip to next word
	if currentCol < len(textGrid[currentRow]) && utils.IsSpace(textGrid[currentRow][currentCol]) {
		// Skip whitespace to find next word
		for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
			if !utils.IsSpace(textGrid[currentRow][currentCol]) {
				break
			}
			currentCol++
		}

		// Handle end of line
		if currentRow < len(textGrid) && currentCol >= len(textGrid[currentRow]) {
			currentRow++
			currentCol = 0
			// Skip leading whitespace on new line
			for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
				if !utils.IsSpace(textGrid[currentRow][currentCol]) {
					break
				}
				currentCol++
			}
		}
	}

	// Now we should be on a non-space character
	if currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]

		if utils.IsWordChar(currentChar) {
			// Check if we're already at the end of a word
			isAtWordEnd := (currentCol == len(textGrid[currentRow])-1) ||
				(currentCol+1 < len(textGrid[currentRow]) &&
					!utils.IsWordChar(textGrid[currentRow][currentCol+1]))

			if isAtWordEnd {
				// Already at end of word, move to end of next word
				currentCol++

				// Skip whitespace
				for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					if !utils.IsSpace(textGrid[currentRow][currentCol]) {
						break
					}
					currentCol++
				}

				// Handle end of line
				if currentRow < len(textGrid) && currentCol >= len(textGrid[currentRow]) {
					currentRow++
					currentCol = 0
					// Skip leading whitespace
					for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
						if !utils.IsSpace(textGrid[currentRow][currentCol]) {
							break
						}
						currentCol++
					}
				}

				// Now find end of this word
				if currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					currentChar = textGrid[currentRow][currentCol]
					if utils.IsWordChar(currentChar) {
						// Move to end of word
						for currentCol < len(textGrid[currentRow])-1 {
							nextChar := textGrid[currentRow][currentCol+1]
							if !utils.IsWordChar(nextChar) {
								break
							}
							currentCol++
						}
					} else if utils.IsPunctuation(currentChar) {
						// Punctuation is its own word, already at end
					}
				}
			} else {
				// Not at end of word, move to end of current word
				for currentCol < len(textGrid[currentRow])-1 {
					nextChar := textGrid[currentRow][currentCol+1]
					if !utils.IsWordChar(nextChar) {
						break
					}
					currentCol++
				}
			}
		} else if utils.IsPunctuation(currentChar) {
			// Check if we're already at the end of a punctuation sequence
			isAtPuncEnd := (currentCol == len(textGrid[currentRow])-1) ||
				(currentCol+1 < len(textGrid[currentRow]) &&
					!utils.IsPunctuation(textGrid[currentRow][currentCol+1]))

			if isAtPuncEnd {
				// Move to next word
				currentCol++

				// Skip whitespace
				for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					if !utils.IsSpace(textGrid[currentRow][currentCol]) {
						break
					}
					currentCol++
				}

				// Handle end of line
				if currentRow < len(textGrid) && currentCol >= len(textGrid[currentRow]) {
					currentRow++
					currentCol = 0
					for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
						if !utils.IsSpace(textGrid[currentRow][currentCol]) {
							break
						}
						currentCol++
					}
				}

				// Find end of this word
				if currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					currentChar = textGrid[currentRow][currentCol]
					if utils.IsWordChar(currentChar) {
						for currentCol < len(textGrid[currentRow])-1 {
							nextChar := textGrid[currentRow][currentCol+1]
							if !utils.IsWordChar(nextChar) {
								break
							}
							currentCol++
						}
					}
				}
			} else {
				// Move to end of current punctuation sequence
				for currentCol < len(textGrid[currentRow])-1 {
					nextChar := textGrid[currentRow][currentCol+1]
					if !utils.IsPunctuation(nextChar) {
						break
					}
					currentCol++
				}
			}
		}
	}

	// Ensure bounds
	if currentRow >= len(textGrid) {
		currentRow = len(textGrid) - 1
		currentCol = len(textGrid[currentRow]) - 1
	} else if currentRow >= 0 && currentCol >= len(textGrid[currentRow]) {
		currentCol = len(textGrid[currentRow]) - 1
	}

	return currentRow, currentCol
}

// FindWordEndSpace finds end of space-separated word
func FindWordEndSpace(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	// If we're at end of WORD, move to next WORD first
	if currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]
		if !utils.IsSpace(currentChar) {
			// Skip current WORD (everything until space)
			for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
				curChar := textGrid[currentRow][currentCol]
				if utils.IsSpace(curChar) {
					break
				}
				currentCol++
			}

			// Skip whitespace to next WORD
			for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
				curChar := textGrid[currentRow][currentCol]
				if !utils.IsSpace(curChar) {
					break
				}
				currentCol++
			}

			// Handle end of line
			if currentRow < len(textGrid) && currentCol >= len(textGrid[currentRow]) {
				currentRow++
				currentCol = 0
				// Skip leading whitespace
				for currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
					curChar := textGrid[currentRow][currentCol]
					if !utils.IsSpace(curChar) {
						break
					}
					currentCol++
				}
			}
		}
	}

	// Now find end of current WORD (space-separated)
	if currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		// Move to end of current WORD
		for currentCol < len(textGrid[currentRow])-1 {
			nextChar := textGrid[currentRow][currentCol+1]
			if utils.IsSpace(nextChar) {
				break
			}
			currentCol++
		}
	}

	// Ensure bounds
	if currentRow >= len(textGrid) {
		currentRow = len(textGrid) - 1
		currentCol = len(textGrid[currentRow]) - 1
	} else if currentRow >= 0 && currentCol >= len(textGrid[currentRow]) {
		currentCol = len(textGrid[currentRow]) - 1
	}

	return currentRow, currentCol
}

// FindWordEndPrev finds end of previous word
func FindWordEndPrev(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	// First, move backwards from current position to find the start of the previous word
	// If we're currently on a word character, we need to get to the beginning of the current word first
	if currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]

		// If we're in the middle of a word, move to its beginning first
		if utils.IsWordChar(currentChar) {
			for currentCol > 0 {
				prevChar := textGrid[currentRow][currentCol-1]
				if !utils.IsWordChar(prevChar) {
					break
				}
				currentCol--
			}
		} else if utils.IsPunctuation(currentChar) {
			// If we're on punctuation, move to beginning of punctuation sequence
			for currentCol > 0 {
				prevChar := textGrid[currentRow][currentCol-1]
				if !utils.IsPunctuation(prevChar) {
					break
				}
				currentCol--
			}
		}
	}

	// Now move backward one position to start searching for previous word
	currentCol--
	if currentCol < 0 {
		if currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		} else {
			return row, col // At beginning, blocked
		}
	}

	if currentRow < 0 || currentCol < 0 {
		return row, col
	}

	// Skip whitespace backwards to find previous word
	for currentRow >= 0 && currentCol >= 0 {
		if currentRow >= len(textGrid) || currentCol >= len(textGrid[currentRow]) {
			break
		}
		currentChar := textGrid[currentRow][currentCol]
		if !utils.IsSpace(currentChar) {
			break
		}
		currentCol--
		if currentCol < 0 && currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		}
	}

	// Now we should be on the last character of the previous word
	// Find the end of this word
	if currentRow >= 0 && currentCol >= 0 && currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]

		if utils.IsWordChar(currentChar) {
			// Find end of this word
			for currentCol < len(textGrid[currentRow])-1 {
				nextChar := textGrid[currentRow][currentCol+1]
				if !utils.IsWordChar(nextChar) {
					break
				}
				currentCol++
			}
		} else if utils.IsPunctuation(currentChar) {
			// Find end of punctuation sequence
			for currentCol < len(textGrid[currentRow])-1 {
				nextChar := textGrid[currentRow][currentCol+1]
				if !utils.IsPunctuation(nextChar) {
					break
				}
				currentCol++
			}
		}
	}

	// Ensure bounds
	if currentRow < 0 {
		currentRow = 0
		currentCol = 0
	} else if currentCol < 0 {
		currentCol = 0
	} else if currentRow >= 0 && currentCol >= len(textGrid[currentRow]) {
		currentCol = len(textGrid[currentRow]) - 1
	}

	// Only return if different from original position
	if currentRow != row || currentCol != col {
		return currentRow, currentCol
	}
	return row, col // Blocked
}

// FindWordEndPrevSpace finds end of previous space-separated word
func FindWordEndPrevSpace(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	// First, if we're currently in a WORD (any non-blank), move to its beginning
	if currentCol < len(textGrid[currentRow]) {
		currentChar := textGrid[currentRow][currentCol]

		// If we're in the middle of a WORD (non-blank), move to its beginning first
		if !utils.IsSpace(currentChar) {
			for currentCol > 0 {
				prevChar := textGrid[currentRow][currentCol-1]
				if utils.IsSpace(prevChar) {
					break
				}
				currentCol--
			}
		}
	}

	// Now move backward one position to start searching for previous WORD
	currentCol--
	if currentCol < 0 {
		if currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		} else {
			return row, col // At beginning, blocked
		}
	}

	if currentRow < 0 || currentCol < 0 {
		return row, col
	}

	// Skip whitespace backwards to find previous WORD
	for currentRow >= 0 && currentCol >= 0 {
		if currentRow >= len(textGrid) || currentCol >= len(textGrid[currentRow]) {
			break
		}
		currentChar := textGrid[currentRow][currentCol]
		if !utils.IsSpace(currentChar) {
			break
		}
		currentCol--
		if currentCol < 0 && currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		}
	}

	// Now we should be on some character of the previous WORD
	// For gE, a WORD is any sequence of non-blank characters (including punctuation)
	// So we find the end of this WORD by moving forward until we hit a space
	if currentRow >= 0 && currentCol >= 0 && currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
		// Find end of current WORD (any non-blank sequence until space)
		for currentCol < len(textGrid[currentRow])-1 {
			nextChar := textGrid[currentRow][currentCol+1]
			if utils.IsSpace(nextChar) {
				break
			}
			currentCol++
		}
	}

	// Ensure bounds
	if currentRow < 0 {
		currentRow = 0
		currentCol = 0
	} else if currentCol < 0 {
		currentCol = 0
	} else if currentRow >= 0 && currentCol >= len(textGrid[currentRow]) {
		currentCol = len(textGrid[currentRow]) - 1
	}

	// Only return if different from original position
	if currentRow != row || currentCol != col {
		return currentRow, currentCol
	}
	return row, col // Blocked
}
