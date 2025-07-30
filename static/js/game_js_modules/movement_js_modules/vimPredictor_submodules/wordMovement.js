/**
 * Word movement handlers for Vim Movement Predictor
 * Handles all word-based movements (w, W, b, B, e, E, ge, gE)
 * Matches Go backend word.go exactly
 */

import { isWordChar, isPunctuation, isSpace } from './utils.js';

// Word movement handler (matches Go backend word.go)
export function handleWordMovement(direction, currentRow, currentCol, textGrid) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = 0;
  
  switch (direction) {
    case "word_forward":
    case "word_forward_space":
      ({ newRow, newCol } = findWordForward(currentRow, currentCol, textGrid, direction === "word_forward_space"));
      newPreferredColumn = newCol;
      break;
    case "word_backward":
    case "word_backward_space":
      ({ newRow, newCol } = findWordBackward(currentRow, currentCol, textGrid, direction === "word_backward_space"));
      newPreferredColumn = newCol;
      break;
    case "word_end":
      ({ newRow, newCol } = findWordEnd(currentRow, currentCol, textGrid));
      newPreferredColumn = newCol;
      break;
    case "word_end_space":
      ({ newRow, newCol } = findWordEndSpace(currentRow, currentCol, textGrid));
      newPreferredColumn = newCol;
      break;
    case "word_end_prev":
      ({ newRow, newCol } = findWordEndPrev(currentRow, currentCol, textGrid));
      newPreferredColumn = newCol;
      break;
    case "word_end_prev_space":
      ({ newRow, newCol } = findWordEndPrevSpace(currentRow, currentCol, textGrid));
      newPreferredColumn = newCol;
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// Find word forward (matches Go backend word.go)
export function findWordForward(row, col, textGrid, spaceSeparated) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // Debug logging for word movement
  const currentChar = col < textGrid[row].length ? textGrid[row][col] : '';
  logger.debug('findWordForward debug:', {
    startRow: row,
    startCol: col,
    spaceSeparated,
    currentChar: col < textGrid[row].length ? `"${currentChar}"` : 'end-of-line',
    currentCharCode: currentChar ? currentChar.charCodeAt(0) : 'n/a',
    lineContent: `"${textGrid[row].join('')}"`,
    isSpace: col < textGrid[row].length ? isSpace(currentChar) : false,
    isWordChar: col < textGrid[row].length ? isWordChar(currentChar) : false,
    isPunctuation: col < textGrid[row].length ? isPunctuation(currentChar) : false
  });
  
  if (spaceSeparated) {
    // For W: skip current WORD (space-separated)
    while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
      const currentChar = textGrid[currentRow][currentCol];
      if (isSpace(currentChar)) {
        break;
      }
      currentCol++;
    }
  } else {
    // For w: vim-like word boundaries
    if (currentCol < textGrid[currentRow].length) {
      const currentChar = textGrid[currentRow][currentCol];
      
      if (isWordChar(currentChar)) {
        // Skip current word (alphanumeric + underscore)
        while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          const char = textGrid[currentRow][currentCol];
          if (!isWordChar(char)) {
            break;
          }
          currentCol++;
        }
      } else if (isPunctuation(currentChar)) {
        // Skip current punctuation character (vim treats each punctuation as separate word)
        currentCol++;
        logger.debug('Punctuation: moved to position', currentCol, 'continuing to whitespace/line-wrap logic');
      }
    }
  }
  
  // Skip whitespace
  while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    if (!isSpace(currentChar)) {
      break;
    }
    currentCol++;
  }
  
  // If we reached end of line, go to next line
  if (currentRow < textGrid.length && currentCol >= textGrid[currentRow].length) {
    currentRow++;
    currentCol = 0;
    // Skip leading whitespace on new line
    while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
      const currentChar = textGrid[currentRow][currentCol];
      if (!isSpace(currentChar)) {
        break;
      }
      currentCol++;
    }
  }
  
  // Ensure bounds
  if (currentRow >= textGrid.length) {
    currentRow = textGrid.length - 1;
    currentCol = textGrid[currentRow].length - 1;
  } else if (currentRow >= 0 && currentCol >= textGrid[currentRow].length) {
    currentCol = textGrid[currentRow].length - 1;
  }
  
  logger.debug('findWordForward result:', {
    originalPos: `${row},${col}`,
    newPos: `${currentRow},${currentCol}`,
    moved: (currentRow !== row || currentCol !== col)
  });
  
  return { newRow: currentRow, newCol: currentCol };
}

// Find word backward (matches Go backend word.go)
export function findWordBackward(row, col, textGrid, spaceSeparated) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // Move one position back to start
  currentCol--;
  if (currentCol < 0) {
    if (currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    } else {
      return { newRow: 0, newCol: 0 }; // At beginning
    }
  }
  
  if (currentRow < 0 || currentCol < 0) {
    return { newRow: 0, newCol: 0 };
  }
  
  // Skip whitespace backwards
  while (currentRow >= 0 && currentCol >= 0) {
    if (currentRow >= textGrid.length || currentCol >= textGrid[currentRow].length) {
      break;
    }
    const currentChar = textGrid[currentRow][currentCol];
    if (!isSpace(currentChar)) {
      break;
    }
    currentCol--;
    if (currentCol < 0 && currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    }
  }
  
  // Find beginning of current word
  if (currentRow >= 0 && currentCol >= 0 && currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    
    if (spaceSeparated) {
      // For B: move to beginning of WORD (space-separated)
      while (currentCol > 0) {
        const prevChar = textGrid[currentRow][currentCol - 1];
        if (isSpace(prevChar)) {
          break;
        }
        currentCol--;
      }
    } else {
      // For b: vim-like word boundaries
      if (isWordChar(currentChar)) {
        // Move to beginning of word
        while (currentCol > 0) {
          const prevChar = textGrid[currentRow][currentCol - 1];
          if (!isWordChar(prevChar)) {
            break;
          }
          currentCol--;
        }
      } else if (isPunctuation(currentChar)) {
        // Each punctuation is its own word, already at beginning
      }
    }
  }
  
  // Ensure bounds
  if (currentRow < 0) {
    currentRow = 0;
    currentCol = 0;
  } else if (currentCol < 0) {
    currentCol = 0;
  }
  
  return { newRow: currentRow, newCol: currentCol };
}

// Find word end (matches Go backend word.go)
export function findWordEnd(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // Check if we're currently on whitespace - if so, skip to next word
  if (currentCol < textGrid[currentRow].length && isSpace(textGrid[currentRow][currentCol])) {
    // Skip whitespace to find next word
    while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
      if (!isSpace(textGrid[currentRow][currentCol])) {
        break;
      }
      currentCol++;
    }
    
    // Handle end of line
    if (currentRow < textGrid.length && currentCol >= textGrid[currentRow].length) {
      currentRow++;
      currentCol = 0;
      // Skip leading whitespace on new line
      while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
        if (!isSpace(textGrid[currentRow][currentCol])) {
          break;
        }
        currentCol++;
      }
    }
  }
  
  // Now we should be on a non-space character
  if (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    let currentChar = textGrid[currentRow][currentCol];
    
    if (isWordChar(currentChar)) {
      // Check if we're already at the end of a word
      const isAtWordEnd = (currentCol === textGrid[currentRow].length - 1) ||
        (currentCol + 1 < textGrid[currentRow].length &&
          !isWordChar(textGrid[currentRow][currentCol + 1]));
      
      if (isAtWordEnd) {
        // Already at end of word, move to end of next word
        currentCol++;
        
        // Skip whitespace
        while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          if (!isSpace(textGrid[currentRow][currentCol])) {
            break;
          }
          currentCol++;
        }
        
        // Handle end of line
        if (currentRow < textGrid.length && currentCol >= textGrid[currentRow].length) {
          currentRow++;
          currentCol = 0;
          // Skip leading whitespace
          while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
            if (!isSpace(textGrid[currentRow][currentCol])) {
              break;
            }
            currentCol++;
          }
        }
        
        // Now find end of this word
        if (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          currentChar = textGrid[currentRow][currentCol];
          if (isWordChar(currentChar)) {
            // Move to end of word
            while (currentCol < textGrid[currentRow].length - 1) {
              const nextChar = textGrid[currentRow][currentCol + 1];
              if (!isWordChar(nextChar)) {
                break;
              }
              currentCol++;
            }
          } else if (isPunctuation(currentChar)) {
            // Punctuation is its own word, already at end
          }
        }
      } else {
        // Not at end of word, move to end of current word
        while (currentCol < textGrid[currentRow].length - 1) {
          const nextChar = textGrid[currentRow][currentCol + 1];
          if (!isWordChar(nextChar)) {
            break;
          }
          currentCol++;
        }
      }
    } else if (isPunctuation(currentChar)) {
      // Check if we're already at the end of a punctuation sequence
      const isAtPuncEnd = (currentCol === textGrid[currentRow].length - 1) ||
        (currentCol + 1 < textGrid[currentRow].length &&
          !isPunctuation(textGrid[currentRow][currentCol + 1]));
      
      if (isAtPuncEnd) {
        // Move to next word
        currentCol++;
        
        // Skip whitespace
        while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          if (!isSpace(textGrid[currentRow][currentCol])) {
            break;
          }
          currentCol++;
        }
        
        // Handle end of line
        if (currentRow < textGrid.length && currentCol >= textGrid[currentRow].length) {
          currentRow++;
          currentCol = 0;
          while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
            if (!isSpace(textGrid[currentRow][currentCol])) {
              break;
            }
            currentCol++;
          }
        }
        
        // Find end of this word
        if (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          currentChar = textGrid[currentRow][currentCol];
          if (isWordChar(currentChar)) {
            while (currentCol < textGrid[currentRow].length - 1) {
              const nextChar = textGrid[currentRow][currentCol + 1];
              if (!isWordChar(nextChar)) {
                break;
              }
              currentCol++;
            }
          }
        }
      } else {
        // Move to end of current punctuation sequence
        while (currentCol < textGrid[currentRow].length - 1) {
          const nextChar = textGrid[currentRow][currentCol + 1];
          if (!isPunctuation(nextChar)) {
            break;
          }
          currentCol++;
        }
      }
    }
  }
  
  // Ensure bounds
  if (currentRow >= textGrid.length) {
    currentRow = textGrid.length - 1;
    currentCol = textGrid[currentRow].length - 1;
  } else if (currentRow >= 0 && currentCol >= textGrid[currentRow].length) {
    currentCol = textGrid[currentRow].length - 1;
  }
  
  return { newRow: currentRow, newCol: currentCol };
}

// Find word end space (matches Go backend word.go)
export function findWordEndSpace(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // If we're at end of WORD, move to next WORD first
  if (currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    if (!isSpace(currentChar)) {
      // Skip current WORD (everything until space)
      while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
        const curChar = textGrid[currentRow][currentCol];
        if (isSpace(curChar)) {
          break;
        }
        currentCol++;
      }
      
      // Skip whitespace to next WORD
      while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
        const curChar = textGrid[currentRow][currentCol];
        if (!isSpace(curChar)) {
          break;
        }
        currentCol++;
      }
      
      // Handle end of line
      if (currentRow < textGrid.length && currentCol >= textGrid[currentRow].length) {
        currentRow++;
        currentCol = 0;
        // Skip leading whitespace
        while (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
          const curChar = textGrid[currentRow][currentCol];
          if (!isSpace(curChar)) {
            break;
          }
          currentCol++;
        }
      }
    }
  }
  
  // Now find end of current WORD (space-separated)
  if (currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    // Move to end of current WORD
    while (currentCol < textGrid[currentRow].length - 1) {
      const nextChar = textGrid[currentRow][currentCol + 1];
      if (isSpace(nextChar)) {
        break;
      }
      currentCol++;
    }
  }
  
  // Ensure bounds
  if (currentRow >= textGrid.length) {
    currentRow = textGrid.length - 1;
    currentCol = textGrid[currentRow].length - 1;
  } else if (currentRow >= 0 && currentCol >= textGrid[currentRow].length) {
    currentCol = textGrid[currentRow].length - 1;
  }
  
  return { newRow: currentRow, newCol: currentCol };
}

// Find word end previous (matches Go backend word.go)
export function findWordEndPrev(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // First, move backwards from current position to find the start of the previous word
  if (currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    
    // If we're in the middle of a word, move to its beginning first
    if (isWordChar(currentChar)) {
      while (currentCol > 0) {
        const prevChar = textGrid[currentRow][currentCol - 1];
        if (!isWordChar(prevChar)) {
          break;
        }
        currentCol--;
      }
    } else if (isPunctuation(currentChar)) {
      // If we're on punctuation, move to beginning of punctuation sequence
      while (currentCol > 0) {
        const prevChar = textGrid[currentRow][currentCol - 1];
        if (!isPunctuation(prevChar)) {
          break;
        }
        currentCol--;
      }
    }
  }
  
  // Now move backward one position to start searching for previous word
  currentCol--;
  if (currentCol < 0) {
    if (currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    } else {
      return { newRow: row, newCol: col }; // At beginning, blocked
    }
  }
  
  if (currentRow < 0 || currentCol < 0) {
    return { newRow: row, newCol: col };
  }
  
  // Skip whitespace backwards to find previous word
  while (currentRow >= 0 && currentCol >= 0) {
    if (currentRow >= textGrid.length || currentCol >= textGrid[currentRow].length) {
      break;
    }
    const currentChar = textGrid[currentRow][currentCol];
    if (!isSpace(currentChar)) {
      break;
    }
    currentCol--;
    if (currentCol < 0 && currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    }
  }
  
  // Now we should be on the last character of the previous word
  if (currentRow >= 0 && currentCol >= 0 && currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    
    if (isWordChar(currentChar)) {
      // Find end of this word
      while (currentCol < textGrid[currentRow].length - 1) {
        const nextChar = textGrid[currentRow][currentCol + 1];
        if (!isWordChar(nextChar)) {
          break;
        }
        currentCol++;
      }
    } else if (isPunctuation(currentChar)) {
      // Find end of punctuation sequence
      while (currentCol < textGrid[currentRow].length - 1) {
        const nextChar = textGrid[currentRow][currentCol + 1];
        if (!isPunctuation(nextChar)) {
          break;
        }
        currentCol++;
      }
    }
  }
  
  // Ensure bounds
  if (currentRow < 0) {
    currentRow = 0;
    currentCol = 0;
  } else if (currentCol < 0) {
    currentCol = 0;
  } else if (currentRow >= 0 && currentCol >= textGrid[currentRow].length) {
    currentCol = textGrid[currentRow].length - 1;
  }
  
  // Only return if different from original position
  if (currentRow !== row || currentCol !== col) {
    return { newRow: currentRow, newCol: currentCol };
  }
  return { newRow: row, newCol: col }; // Blocked
}

// Find word end previous space (matches Go backend word.go)
export function findWordEndPrevSpace(row, col, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return { newRow: row, newCol: col };
  }
  
  let currentRow = row;
  let currentCol = col;
  
  // First, if we're currently in a WORD (any non-blank), move to its beginning
  if (currentCol < textGrid[currentRow].length) {
    const currentChar = textGrid[currentRow][currentCol];
    
    // If we're in the middle of a WORD (non-blank), move to its beginning first
    if (!isSpace(currentChar)) {
      while (currentCol > 0) {
        const prevChar = textGrid[currentRow][currentCol - 1];
        if (isSpace(prevChar)) {
          break;
        }
        currentCol--;
      }
    }
  }
  
  // Now move backward one position to start searching for previous WORD
  currentCol--;
  if (currentCol < 0) {
    if (currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    } else {
      return { newRow: row, newCol: col }; // At beginning, blocked
    }
  }
  
  if (currentRow < 0 || currentCol < 0) {
    return { newRow: row, newCol: col };
  }
  
  // Skip whitespace backwards to find previous WORD
  while (currentRow >= 0 && currentCol >= 0) {
    if (currentRow >= textGrid.length || currentCol >= textGrid[currentRow].length) {
      break;
    }
    const currentChar = textGrid[currentRow][currentCol];
    if (!isSpace(currentChar)) {
      break;
    }
    currentCol--;
    if (currentCol < 0 && currentRow > 0) {
      currentRow--;
      if (currentRow >= 0 && currentRow < textGrid.length) {
        currentCol = textGrid[currentRow].length - 1;
      }
    }
  }
  
  // Now we should be on some character of the previous WORD
  if (currentRow >= 0 && currentCol >= 0 && currentRow < textGrid.length && currentCol < textGrid[currentRow].length) {
    // Find end of current WORD (any non-blank sequence until space)
    while (currentCol < textGrid[currentRow].length - 1) {
      const nextChar = textGrid[currentRow][currentCol + 1];
      if (isSpace(nextChar)) {
        break;
      }
      currentCol++;
    }
  }
  
  // Ensure bounds
  if (currentRow < 0) {
    currentRow = 0;
    currentCol = 0;
  } else if (currentCol < 0) {
    currentCol = 0;
  } else if (currentRow >= 0 && currentCol >= textGrid[currentRow].length) {
    currentCol = textGrid[currentRow].length - 1;
  }
  
  // Only return if different from original position
  if (currentRow !== row || currentCol !== col) {
    return { newRow: currentRow, newCol: currentCol };
  }
  return { newRow: row, newCol: col }; // Blocked
}