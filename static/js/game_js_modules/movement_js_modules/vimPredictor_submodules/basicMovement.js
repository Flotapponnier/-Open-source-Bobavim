/**
 * Basic movement handlers for Vim Movement Predictor
 * Handles basic directional movements, line movements, file movements, and screen movements
 * Matches Go backend basic.go
 */

import { clampToRow, findFirstNonBlank, findLastNonBlank } from './utils.js';

// Basic movement handler (matches Go backend basic.go)
export function handleBasicMovement(direction, currentRow, currentCol, preferredColumn, gameMap) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = preferredColumn;
  
  switch (direction) {
    case "left":
      // h: move left one character
      if (currentCol > 0) {
        newCol = currentCol - 1;
      }
      // Update preferred column to new position
      newPreferredColumn = newCol;
      break;
    case "right":
      // l: move right one character
      if (currentCol < gameMap[currentRow].length - 1) {
        newCol = currentCol + 1;
      }
      // Update preferred column to new position
      newPreferredColumn = newCol;
      break;
    case "up":
      // k: move up one line
      if (currentRow > 0) {
        newRow = currentRow - 1;
        // Use preferred column, but clamp to target line length
        newCol = clampToRow(preferredColumn, newRow, gameMap);
      }
      // Don't update preferred column for vertical movements
      break;
    case "down":
      // j: move down one line
      if (currentRow < gameMap.length - 1) {
        newRow = currentRow + 1;
        // Use preferred column, but clamp to target line length
        newCol = clampToRow(preferredColumn, newRow, gameMap);
      }
      // Don't update preferred column for vertical movements
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// Line movement handler (matches Go backend basic.go)
export function handleLineMovement(direction, currentRow, currentCol, gameMap, textGrid) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = 0;
  
  switch (direction) {
    case "line_end":
      // $: move to end of line
      if (gameMap[currentRow].length > 0) {
        newCol = gameMap[currentRow].length - 1;
      }
      newPreferredColumn = newCol;
      break;
    case "line_start":
      // 0: move to start of line
      newCol = 0;
      newPreferredColumn = newCol;
      break;
    case "line_first_non_blank":
      // ^: move to first non-blank character
      newCol = findFirstNonBlank(currentRow, textGrid);
      newPreferredColumn = newCol;
      break;
    case "line_last_non_blank":
      // g_: move to last non-blank character
      newCol = findLastNonBlank(currentRow, textGrid);
      newPreferredColumn = newCol;
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// File movement handler (matches Go backend basic.go)
export function handleFileMovement(direction, currentRow, currentCol, preferredColumn, gameMap) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = 0;
  
  switch (direction) {
    case "file_start":
      newRow = 0;
      newCol = 0;
      newPreferredColumn = newCol;
      break;
    case "file_end":
      newRow = gameMap.length - 1;
      newCol = clampToRow(currentCol, newRow, gameMap);
      newPreferredColumn = newCol;
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// File movement with count handler (matches Go backend basic.go)
export function handleFileMovementWithCount(direction, currentRow, currentCol, preferredColumn, gameMap, count, hasExplicitCount = false) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = 0;
  
  switch (direction) {
    case "file_start":
      newRow = 0;
      newCol = 0;
      newPreferredColumn = newCol;
      break;
    case "file_end":
      if (hasExplicitCount) {
        // With explicit count, G goes to absolute line number (count - 1 since we're 0-indexed)
        newRow = count - 1;
        // Clamp to valid range
        if (newRow >= gameMap.length) {
          newRow = gameMap.length - 1;
        }
        if (newRow < 0) {
          newRow = 0;
        }
      } else {
        // Without explicit count, G goes to last line
        newRow = gameMap.length - 1;
      }
      // Preserve the current column position, but clamp to target line's length
      newCol = clampToRow(currentCol, newRow, gameMap);
      newPreferredColumn = newCol;
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}

// Screen movement handler (matches Go backend basic.go)
export function handleScreenMovement(direction, currentRow, currentCol, preferredColumn, gameMap) {
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = preferredColumn;
  
  switch (direction) {
    case "screen_top":
      newRow = 0;
      newCol = clampToRow(preferredColumn, newRow, gameMap);
      break;
    case "screen_middle":
      newRow = Math.floor(gameMap.length / 2);
      newCol = clampToRow(preferredColumn, newRow, gameMap);
      break;
    case "screen_bottom":
      newRow = gameMap.length - 1;
      newCol = clampToRow(preferredColumn, newRow, gameMap);
      break;
  }
  
  return { newRow, newCol, newPreferredColumn };
}