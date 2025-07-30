/**
 * Utility functions for Vim Movement Predictor
 * These functions exactly match the Go backend text_utils.go
 */

// Character classification functions (matches Go backend text_utils.go)
export function isWordChar(char) {
  if (!char || char.length === 0) return false;
  const c = char.charCodeAt(0);
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95;
}

export function isSpace(char) {
  return char === ' ' || char === '\t';
}

export function isPunctuation(char) {
  if (!char || char.length === 0) return false;
  return !isWordChar(char) && !isSpace(char);
}

export function clampToRow(preferredCol, row, gameMap) {
  if (row < 0 || row >= gameMap.length) {
    return preferredCol;
  }
  
  const maxCol = gameMap[row].length - 1;
  if (preferredCol < 0) return 0;
  if (preferredCol > maxCol) return maxCol;
  return preferredCol;
}

// Check if a line is empty (has no valid characters)
export function isLineEmpty(line) {
  if (!line || line.length === 0) {
    return true;
  }
  // Check if line contains only spaces or empty strings
  return line.every(char => isSpace(char) || char === "");
}

// Position validation
export function isValidPosition(row, col, gameMap) {
  // Basic bounds check
  if (!(row >= 0 && row < gameMap.length && col >= 0 && col < gameMap[row].length)) {
    return false;
  }
  
  // Don't allow movement to empty lines (matches backend behavior)
  if (isLineEmpty(gameMap[row])) {
    return false;
  }
  
  return true;
}

// Helper functions for line movement
export function findFirstNonBlank(row, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return 0;
  }
  
  for (let col = 0; col < textGrid[row].length; col++) {
    const char = textGrid[row][col];
    if (!isSpace(char) && char !== "") {
      return col;
    }
  }
  
  return 0;
}

export function findLastNonBlank(row, textGrid) {
  if (row < 0 || row >= textGrid.length) {
    return 0;
  }
  
  if (textGrid[row].length === 0) {
    return 0;
  }
  
  for (let col = textGrid[row].length - 1; col >= 0; col--) {
    const char = textGrid[row][col];
    if (!isSpace(char) && char !== "") {
      return col;
    }
  }
  
  return 0;
}