/**
 * Special movement handlers for Vim Movement Predictor
 * Handles paragraph, sentence, character search, and bracket matching movements
 * Simplified implementations that provide basic functionality
 */

import { isSpace } from './utils.js';

// Last character search state (matches Go backend)
export let lastCharSearch = {
  command: '',    // "f", "F", "t", "T" to match backend
  character: '',
  isTill: false
};

// Paragraph movement handler (exact match to Go backend)
export function handleParagraphMovement(direction, currentRow, currentCol, textGrid) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = 0;
  
  if (direction === "paragraph_prev") {
    const result = findParagraphPrev(currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = newCol;
  } else if (direction === "paragraph_next") {
    const result = findParagraphNext(currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = newCol;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// Find previous paragraph (exact match to Go backend)
function findParagraphPrev(row, col, textGrid) {
  
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }

  let currentRow = row;

  // Move one row up
  currentRow--;
  if (currentRow < 0) {
    return { newRow: row, newCol: col };
  }

  // Find the first empty line above current position
  while (currentRow >= 0) {
    if (isLineEmpty(textGrid[currentRow])) {
      break;
    }
    currentRow--;
  }

  // If no empty line found, return original position
  if (currentRow < 0) {
    return { newRow: row, newCol: col };
  }

  // Skip consecutive empty lines
  while (currentRow >= 0 && isLineEmpty(textGrid[currentRow])) {
    currentRow--;
  }

  // If we found a non-empty line, return it
  if (currentRow >= 0) {
    return { newRow: currentRow, newCol: 0 };
  }

  // Otherwise return original position
  return { newRow: row, newCol: col };
}

// Find next paragraph (exact match to Go backend)
function findParagraphNext(row, col, textGrid) {
  
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }

  let currentRow = row;

  // Move one row down
  currentRow++;
  if (currentRow >= textGrid.length) {
      return { newRow: row, newCol: col };
  }

  // Find the first empty line below current position
  while (currentRow < textGrid.length) {
    if (isLineEmpty(textGrid[currentRow])) {
      break;
    }
    currentRow++;
  }

  // If no empty line found, return original position
  if (currentRow >= textGrid.length) {
    return { newRow: row, newCol: col };
  }

  // Skip consecutive empty lines
  while (currentRow < textGrid.length && isLineEmpty(textGrid[currentRow])) {
    currentRow++;
  }

  // If we found a non-empty line, return it
  if (currentRow < textGrid.length) {
    return { newRow: currentRow, newCol: 0 };
  }

  // Otherwise return original position
  return { newRow: row, newCol: col };
}

// Helper function to check if line is empty (matches Go backend)
function isLineEmpty(line) {
  if (line.length === 0) {
    return true;
  }
  // Check if line contains only whitespace characters
  return line.every(char => char === ' ' || char === '\t');
}

// Sentence movement handler (matches Go backend exactly)
export function handleSentenceMovement(direction, currentRow, currentCol, textGrid) {
  let newRow = currentRow;
  let newCol = currentCol;
  
  if (direction === "sentence_prev") {
    return findSentencePrev(currentRow, currentCol, textGrid);
  } else if (direction === "sentence_next") {
    return findSentenceNext(currentRow, currentCol, textGrid);
  }
  
  return { newRow, newCol, newPreferredColumn: newCol };
}

// Find previous sentence (matches Go backend exactly)
function findSentencePrev(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col, newPreferredColumn: col };
  }

  let currentRow = row;
  let currentCol = col;

  // Move one position back
  currentCol--;
  if (currentCol < 0) {
    if (currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    } else {
      return { newRow: row, newCol: col, newPreferredColumn: col };
    }
  }

  // Search backwards for sentence terminators
  while (currentRow >= 0) {
    while (currentCol >= 0) {
      if (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
        const char = textGrid[currentRow][currentCol];
        if (char === '.' || char === '!' || char === '?') {
          let lookRow = currentRow;
          let lookCol = currentCol + 1;

          // Check for closing punctuation after terminator
          while (lookRow < textGrid.length && lookCol < textGrid[lookRow].length) {
            const lookChar = textGrid[lookRow][lookCol];
            if (lookChar === ')' || lookChar === ']' || lookChar === '}' || lookChar === '"' || lookChar === "'") {
              lookCol++;
            } else {
              break;
            }
          }

          // Check for valid separator (space or end of line)
          let hasValidSeparator = false;
          if (lookRow < textGrid.length && lookCol < textGrid[lookRow].length) {
            if (isSpace(textGrid[lookRow][lookCol])) {
              hasValidSeparator = true;
            }
          } else if (lookCol >= textGrid[lookRow].length) {
            hasValidSeparator = true;
          }

          if (hasValidSeparator) {
            // Search for the start of the previous sentence
            let searchRow = currentRow;
            let searchCol = currentCol - 1;

            while (searchRow >= 0) {
              while (searchCol >= 0) {
                if (searchRow < textGrid.length && searchCol < textGrid[searchRow].length) {
                  const searchChar = textGrid[searchRow][searchCol];
                  if (searchChar === '.' || searchChar === '!' || searchChar === '?') {
                    searchCol++;
                    if (searchCol >= textGrid[searchRow].length) {
                      searchRow++;
                      searchCol = 0;
                      if (searchRow >= textGrid.length) {
                        break;
                      }
                    }

                    // Find first non-whitespace character after the previous sentence terminator
                    while (searchRow < textGrid.length) {
                      if (searchCol >= textGrid[searchRow].length) {
                        searchRow++;
                        searchCol = 0;
                        if (searchRow >= textGrid.length) {
                          break;
                        }
                        continue;
                      }

                      if (!isSpace(textGrid[searchRow][searchCol]) && textGrid[searchRow][searchCol] !== '') {
                        if (searchRow !== row || searchCol !== col) {
                          return { newRow: searchRow, newCol: searchCol, newPreferredColumn: searchCol };
                        }
                      }
                      searchCol++;
                    }

                    return { newRow: row, newCol: col, newPreferredColumn: col };
                  }
                }
                searchCol--;
              }

              searchRow--;
              if (searchRow >= 0 && searchRow < textGrid.length) {
                searchCol = textGrid[searchRow].length - 1;
              }
            }

            // If no previous sentence found, go to beginning of document
            for (let beginRow = 0; beginRow < textGrid.length; beginRow++) {
              for (let beginCol = 0; beginCol < textGrid[beginRow].length; beginCol++) {
                if (!isSpace(textGrid[beginRow][beginCol]) && textGrid[beginRow][beginCol] !== '') {
                  if (beginRow !== row || beginCol !== col) {
                    return { newRow: beginRow, newCol: beginCol, newPreferredColumn: beginCol };
                  }
                  return { newRow: row, newCol: col, newPreferredColumn: col };
                }
              }
            }
          }
        }
      }

      currentCol--;
    }

    currentRow--;
    if (currentRow >= 0 && currentRow < textGrid.length) {
      currentCol = textGrid[currentRow].length - 1;
    }
  }

  return { newRow: row, newCol: col, newPreferredColumn: col };
}

// Find next sentence (matches Go backend exactly)
function findSentenceNext(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col, newPreferredColumn: col };
  }

  let currentRow = row;
  let currentCol = col;

  // Search forwards for sentence terminators
  while (currentRow < textGrid.length) {
    while (currentCol < textGrid[currentRow].length) {
      const char = textGrid[currentRow][currentCol];

      if (char === '.' || char === '!' || char === '?') {
        let lookRow = currentRow;
        let lookCol = currentCol + 1;

        // Check for closing punctuation after terminator
        while (lookRow < textGrid.length && lookCol < textGrid[lookRow].length) {
          const lookChar = textGrid[lookRow][lookCol];
          if (lookChar === ')' || lookChar === ']' || lookChar === '}' || lookChar === '"' || lookChar === "'") {
            lookCol++;
          } else {
            break;
          }
        }

        // Check for valid separator (space or end of line)
        let hasValidSeparator = false;
        if (lookRow < textGrid.length && lookCol < textGrid[lookRow].length) {
          if (isSpace(textGrid[lookRow][lookCol])) {
            hasValidSeparator = true;
          }
        } else if (lookCol >= textGrid[lookRow].length) {
          hasValidSeparator = true;
        }

        if (hasValidSeparator) {
          // Find first non-whitespace character of the next sentence
          while (lookRow < textGrid.length) {
            if (lookCol >= textGrid[lookRow].length) {
              lookRow++;
              lookCol = 0;
              if (lookRow >= textGrid.length) {
                break;
              }
              continue;
            }

            if (!isSpace(textGrid[lookRow][lookCol]) && textGrid[lookRow][lookCol] !== '') {
              if (lookRow !== row || lookCol !== col) {
                return { newRow: lookRow, newCol: lookCol, newPreferredColumn: lookCol };
              }
            }
            lookCol++;
          }
        }
      }

      currentCol++;
    }

    currentRow++;
    currentCol = 0;
  }

  return { newRow: row, newCol: col, newPreferredColumn: col };
}

// Character search handler
export function handleCharacterSearch(direction, currentRow, currentCol, textGrid) {
  let newRow = currentRow;
  let newCol = currentCol;
  
  logger.debug('Character search debug:', {
    direction,
    currentRow,
    currentCol,
    lastCharSearch: JSON.stringify(lastCharSearch)
  });
  
  if (direction === "repeat_char_search_same") {
    // Repeat last search in same direction
    if (lastCharSearch.command && lastCharSearch.character) {
      logger.debug('Repeating same direction:', lastCharSearch.command, lastCharSearch.character);
      // Don't call handleCharacterSearch recursively to avoid overwriting state
      const char = lastCharSearch.character;
      switch (lastCharSearch.command) {
        case "f":
          // Search forward for character
          for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
            if (textGrid[currentRow][col] === char) {
              newCol = col;
              break;
            }
          }
          break;
        case "F":
          // Search backward for character
          for (let col = currentCol - 1; col >= 0; col--) {
            if (textGrid[currentRow][col] === char) {
              newCol = col;
              break;
            }
          }
          break;
        case "t":
          // Search forward for character, stop one before
          for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
            if (textGrid[currentRow][col] === char) {
              newCol = col - 1;
              break;
            }
          }
          break;
        case "T":
          // Search backward for character, stop one after
          for (let col = currentCol - 1; col >= 0; col--) {
            if (textGrid[currentRow][col] === char) {
              newCol = col + 1;
              break;
            }
          }
          break;
      }
    } else {
      logger.debug('No last char search found for repeat_char_search_same');
    }
  } else if (direction === "repeat_char_search_opposite") {
    // Repeat last search in opposite direction
    if (lastCharSearch.command && lastCharSearch.character) {
      logger.debug('Repeating opposite direction:', lastCharSearch.command, lastCharSearch.character);
      // Don't call handleCharacterSearch recursively to avoid overwriting state
      const char = lastCharSearch.character;
      switch (lastCharSearch.command) {
        case "f":
          // Search backward for character (opposite of f)
          for (let col = currentCol - 1; col >= 0; col--) {
            if (textGrid[currentRow][col] === char) {
              newCol = col;
              break;
            }
          }
          break;
        case "F":
          // Search forward for character (opposite of F)
          for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
            if (textGrid[currentRow][col] === char) {
              newCol = col;
              break;
            }
          }
          break;
        case "t":
          // Search backward for character, stop one after (opposite of t)
          for (let col = currentCol - 1; col >= 0; col--) {
            if (textGrid[currentRow][col] === char) {
              newCol = col + 1;
              break;
            }
          }
          break;
        case "T":
          // Search forward for character, stop one before (opposite of T)
          for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
            if (textGrid[currentRow][col] === char) {
              newCol = col - 1;
              break;
            }
          }
          break;
      }
    } else {
      logger.debug('No last char search found for repeat_char_search_opposite');
    }
  } else if (direction.startsWith('find_char_forward_')) {
    const char = direction.slice(-1);
    logger.debug('Setting lastCharSearch for find_char_forward:', char);
    lastCharSearch = { command: 'f', character: char, isTill: false };
    // Search forward for character
    for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
      if (textGrid[currentRow][col] === char) {
        newCol = col;
        logger.debug('Found char at col:', col);
        break;
      }
    }
  } else if (direction.startsWith('find_char_backward_')) {
    const char = direction.slice(-1);
    logger.debug('Setting lastCharSearch for find_char_backward:', char);
    lastCharSearch = { command: 'F', character: char, isTill: false };
    // Search backward for character
    for (let col = currentCol - 1; col >= 0; col--) {
      if (textGrid[currentRow][col] === char) {
        newCol = col;
        logger.debug('Found char at col:', col);
        break;
      }
    }
  } else if (direction.startsWith('till_char_forward_')) {
    const char = direction.slice(-1);
    logger.debug('Setting lastCharSearch for till_char_forward:', char);
    lastCharSearch = { command: 't', character: char, isTill: true };
    // Search forward for character, stop one before
    for (let col = currentCol + 1; col < textGrid[currentRow].length; col++) {
      if (textGrid[currentRow][col] === char) {
        newCol = col - 1;
        logger.debug('Found char at col:', col, 'stopping at:', col - 1);
        break;
      }
    }
  } else if (direction.startsWith('till_char_backward_')) {
    const char = direction.slice(-1);
    logger.debug('Setting lastCharSearch for till_char_backward:', char);
    lastCharSearch = { command: 'T', character: char, isTill: true };
    // Search backward for character, stop one after
    for (let col = currentCol - 1; col >= 0; col--) {
      if (textGrid[currentRow][col] === char) {
        newCol = col + 1;
        logger.debug('Found char at col:', col, 'stopping at:', col + 1);
        break;
      }
    }
  }
  
  logger.debug('Character search result:', { newRow, newCol, newPreferredColumn: newCol });
  return { newRow, newCol, newPreferredColumn: newCol };
}

// Bracket matching handler (matches Go backend exactly)
export function handleBracketMatching(currentRow, currentCol, textGrid) {
  const result = findMatchingBracket(currentRow, currentCol, textGrid);
  return { newRow: result.newRow, newCol: result.newCol, newPreferredColumn: result.newCol };
}

// Find matching bracket (exact match to Go backend)
function findMatchingBracket(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length || col < 0 || col >= textGrid[row].length) {
    return { newRow: row, newCol: col };
  }

  const currentChar = textGrid[row][col];
  let targetChar;
  let searchForward;

  switch (currentChar) {
    case "(":
      targetChar = ")";
      searchForward = true;
      break;
    case ")":
      targetChar = "(";
      searchForward = false;
      break;
    case "{":
      targetChar = "}";
      searchForward = true;
      break;
    case "}":
      targetChar = "{";
      searchForward = false;
      break;
    case "[":
      targetChar = "]";
      searchForward = true;
      break;
    case "]":
      targetChar = "[";
      searchForward = false;
      break;
    default:
      return { newRow: row, newCol: col };
  }

  if (searchForward) {
    return findMatchingBracketForward(row, col, currentChar, targetChar, textGrid);
  } else {
    return findMatchingBracketBackward(row, col, currentChar, targetChar, textGrid);
  }
}

// Find matching bracket forward (exact match to Go backend)
function findMatchingBracketForward(startRow, startCol, openBracket, closeBracket, textGrid) {
  let nestLevel = 1;
  let currentRow = startRow;
  let currentCol = startCol + 1;

  while (currentRow < textGrid.length) {
    while (currentCol < textGrid[currentRow].length) {
      const char = textGrid[currentRow][currentCol];

      if (char === openBracket) {
        nestLevel++;
      } else if (char === closeBracket) {
        nestLevel--;
        if (nestLevel === 0) {
          return { newRow: currentRow, newCol: currentCol };
        }
      }

      currentCol++;
    }
    currentRow++;
    currentCol = 0;
  }

  return { newRow: startRow, newCol: startCol };
}

// Find matching bracket backward (exact match to Go backend)
function findMatchingBracketBackward(startRow, startCol, closeBracket, openBracket, textGrid) {
  let nestLevel = 1;
  let currentRow = startRow;
  let currentCol = startCol - 1;

  while (currentRow >= 0) {
    while (currentCol >= 0) {
      const char = textGrid[currentRow][currentCol];

      if (char === closeBracket) {
        nestLevel++;
      } else if (char === openBracket) {
        nestLevel--;
        if (nestLevel === 0) {
          return { newRow: currentRow, newCol: currentCol };
        }
      }

      currentCol--;
    }
    currentRow--;
    if (currentRow >= 0 && currentRow < textGrid.length) {
      currentCol = textGrid[currentRow].length - 1;
    }
  }

  return { newRow: startRow, newCol: startCol };
}