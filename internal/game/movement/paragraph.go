package movement

import "boba-vim/internal/utils"

// HandleParagraphMovement handles paragraph movements ({, })
func HandleParagraphMovement(direction string, currentRow, currentCol int, textGrid [][]string) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "paragraph_prev":
		newRow, newCol = FindParagraphPrev(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	case "paragraph_next":
		newRow, newCol = FindParagraphNext(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// HandleSentenceMovement handles sentence movements ((, ))
func HandleSentenceMovement(direction string, currentRow, currentCol int, textGrid [][]string) (int, int, int) {
	newRow, newCol := currentRow, currentCol
	newPreferredColumn := 0

	switch direction {
	case "sentence_prev":
		newRow, newCol = FindSentencePrev(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	case "sentence_next":
		newRow, newCol = FindSentenceNext(currentRow, currentCol, textGrid)
		newPreferredColumn = newCol
	}

	return newRow, newCol, newPreferredColumn
}

// FindParagraphPrev finds previous paragraph
func FindParagraphPrev(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row

	currentRow--
	if currentRow < 0 {
		return row, col
	}

	for currentRow >= 0 {
		if utils.IsLineEmpty(textGrid[currentRow]) {
			break
		}
		currentRow--
	}

	if currentRow < 0 {
		return row, col
	}

	for currentRow >= 0 && utils.IsLineEmpty(textGrid[currentRow]) {
		currentRow--
	}

	if currentRow >= 0 {
		return currentRow, 0
	}

	return row, col
}

// FindParagraphNext finds next paragraph
func FindParagraphNext(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row

	currentRow++
	if currentRow >= len(textGrid) {
		return row, col
	}

	for currentRow < len(textGrid) {
		if utils.IsLineEmpty(textGrid[currentRow]) {
			break
		}
		currentRow++
	}

	if currentRow >= len(textGrid) {
		return row, col
	}

	for currentRow < len(textGrid) && utils.IsLineEmpty(textGrid[currentRow]) {
		currentRow++
	}

	if currentRow < len(textGrid) {
		return currentRow, 0
	}

	return row, col
}

// FindSentencePrev finds previous sentence
func FindSentencePrev(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	currentCol--
	if currentCol < 0 {
		if currentRow > 0 {
			currentRow--
			if currentRow >= 0 && currentRow < len(textGrid) {
				currentCol = len(textGrid[currentRow]) - 1
			}
		} else {
			return row, col
		}
	}

	for currentRow >= 0 {
		for currentCol >= 0 {
			if currentRow < len(textGrid) && currentCol < len(textGrid[currentRow]) {
				char := textGrid[currentRow][currentCol]
				if char == "." || char == "!" || char == "?" {
					lookRow := currentRow
					lookCol := currentCol + 1

					for lookRow < len(textGrid) && lookCol < len(textGrid[lookRow]) {
						lookChar := textGrid[lookRow][lookCol]
						if lookChar == ")" || lookChar == "]" || lookChar == "}" || lookChar == "\"" || lookChar == "'" {
							lookCol++
						} else {
							break
						}
					}

					hasValidSeparator := false
					if lookRow < len(textGrid) && lookCol < len(textGrid[lookRow]) {
						if utils.IsSpace(textGrid[lookRow][lookCol]) {
							hasValidSeparator = true
						}
					} else if lookCol >= len(textGrid[lookRow]) {
						hasValidSeparator = true
					}

					if hasValidSeparator {
						searchRow := currentRow
						searchCol := currentCol - 1

						for searchRow >= 0 {
							for searchCol >= 0 {
								if searchRow < len(textGrid) && searchCol < len(textGrid[searchRow]) {
									searchChar := textGrid[searchRow][searchCol]
									if searchChar == "." || searchChar == "!" || searchChar == "?" {
										searchCol++
										if searchCol >= len(textGrid[searchRow]) {
											searchRow++
											searchCol = 0
											if searchRow >= len(textGrid) {
												break
											}
										}

										for searchRow < len(textGrid) {
											if searchCol >= len(textGrid[searchRow]) {
												searchRow++
												searchCol = 0
												if searchRow >= len(textGrid) {
													break
												}
												continue
											}

											if !utils.IsSpace(textGrid[searchRow][searchCol]) && textGrid[searchRow][searchCol] != "" {
												if searchRow != row || searchCol != col {
													return searchRow, searchCol
												}
											}
											searchCol++
										}

										return row, col
									}
								}
								searchCol--
							}

							searchRow--
							if searchRow >= 0 && searchRow < len(textGrid) {
								searchCol = len(textGrid[searchRow]) - 1
							}
						}

						for beginRow := 0; beginRow < len(textGrid); beginRow++ {
							for beginCol := 0; beginCol < len(textGrid[beginRow]); beginCol++ {
								if !utils.IsSpace(textGrid[beginRow][beginCol]) && textGrid[beginRow][beginCol] != "" {
									if beginRow != row || beginCol != col {
										return beginRow, beginCol
									}
									return row, col
								}
							}
						}
					}
				}
			}

			currentCol--
		}

		currentRow--
		if currentRow >= 0 && currentRow < len(textGrid) {
			currentCol = len(textGrid[currentRow]) - 1
		}
	}

	return row, col
}

// FindSentenceNext finds next sentence
func FindSentenceNext(row, col int, textGrid [][]string) (int, int) {
	if row < 0 || row >= len(textGrid) {
		return row, col
	}

	currentRow := row
	currentCol := col

	for currentRow < len(textGrid) {
		for currentCol < len(textGrid[currentRow]) {
			char := textGrid[currentRow][currentCol]

			if char == "." || char == "!" || char == "?" {
				lookRow := currentRow
				lookCol := currentCol + 1

				for lookRow < len(textGrid) && lookCol < len(textGrid[lookRow]) {
					lookChar := textGrid[lookRow][lookCol]
					if lookChar == ")" || lookChar == "]" || lookChar == "}" || lookChar == "\"" || lookChar == "'" {
						lookCol++
					} else {
						break
					}
				}

				hasValidSeparator := false
				if lookRow < len(textGrid) && lookCol < len(textGrid[lookRow]) {
					if utils.IsSpace(textGrid[lookRow][lookCol]) {
						hasValidSeparator = true
					}
				} else if lookCol >= len(textGrid[lookRow]) {
					hasValidSeparator = true
				}

				if hasValidSeparator {
					for lookRow < len(textGrid) {
						if lookCol >= len(textGrid[lookRow]) {
							lookRow++
							lookCol = 0
							if lookRow >= len(textGrid) {
								break
							}
							continue
						}

						if !utils.IsSpace(textGrid[lookRow][lookCol]) && textGrid[lookRow][lookCol] != "" {
							if lookRow != row || lookCol != col {
								return lookRow, lookCol
							}
						}
						lookCol++
					}
				}
			}

			currentCol++
		}

		currentRow++
		currentCol = 0
	}

	return row, col
}
