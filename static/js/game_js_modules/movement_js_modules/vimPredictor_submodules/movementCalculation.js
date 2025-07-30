/**
 * Movement calculation engine for Vim Movement Predictor
 * Contains the main movement calculation functions that route to appropriate handlers
 * Matches Go backend movement.go
 */

import { ENEMY } from './constants.js';
import { isValidPosition } from './utils.js';
import { isValidDirection } from './validation.js';
import { 
  handleBasicMovement, 
  handleLineMovement, 
  handleFileMovement, 
  handleFileMovementWithCount, 
  handleScreenMovement 
} from './basicMovement.js';
import { handleWordMovement } from './wordMovement.js';
import { 
  handleParagraphMovement, 
  handleSentenceMovement, 
  handleCharacterSearch, 
  handleBracketMatching 
} from './specialMovement.js';

// Main movement calculation function with count support (matches Go backend)
export function calculateNewPositionWithCount(direction, currentRow, currentCol, gameMap, textGrid, preferredColumn, count, hasExplicitCount = false) {
  if (!isValidDirection(direction)) {
    throw new Error(`invalid direction: ${direction}`);
  }
  
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = preferredColumn;
  
  // Route to appropriate movement handler
  if (direction === "left" || direction === "right" || direction === "up" || direction === "down") {
    const result = handleBasicMovement(direction, currentRow, currentCol, preferredColumn, gameMap);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "line_end" || direction === "line_start" || direction === "line_first_non_blank" || direction === "line_last_non_blank") {
    const result = handleLineMovement(direction, currentRow, currentCol, gameMap, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "file_start" || direction === "file_end") {
    // Use the count-aware function for file movements
    const result = handleFileMovementWithCount(direction, currentRow, currentCol, preferredColumn, gameMap, count, hasExplicitCount);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "screen_top" || direction === "screen_middle" || direction === "screen_bottom") {
    const result = handleScreenMovement(direction, currentRow, currentCol, preferredColumn, gameMap);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "word_forward" || direction === "word_forward_space" || direction === "word_backward" || direction === "word_backward_space" || direction === "word_end" || direction === "word_end_space" || direction === "word_end_prev" || direction === "word_end_prev_space") {
    const result = handleWordMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "paragraph_prev" || direction === "paragraph_next") {
    const result = handleParagraphMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "sentence_prev" || direction === "sentence_next") {
    const result = handleSentenceMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "repeat_char_search_same" || direction === "repeat_char_search_opposite" || 
             (direction.length > 17 && (direction.startsWith("find_char_forward") || direction.startsWith("till_char_forward"))) ||
             (direction.length > 18 && (direction.startsWith("find_char_backward") || direction.startsWith("till_char_backward")))) {
    const result = handleCharacterSearch(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "match_bracket") {
    const result = handleBracketMatching(currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else {
    throw new Error(`unknown direction: ${direction}`);
  }
  
  const isValid = isValidPosition(newRow, newCol, gameMap);
  
  // Check if position contains an enemy (block movement)
  let finalIsValid = isValid;
  if (isValid && gameMap[newRow][newCol] === ENEMY) {
    finalIsValid = false;
  }
  
  // Allow paragraph movements to stay at same position (like when at first/last paragraph)
  if (isValid && newRow === currentRow && newCol === currentCol) {
    // Don't invalidate paragraph movements that stay at same position
    if (direction !== "paragraph_prev" && direction !== "paragraph_next") {
      finalIsValid = false;
    }
  }
  
  return {
    newRow: newRow,
    newCol: newCol,
    preferredColumn: newPreferredColumn,
    isValid: finalIsValid
  };
}

// Single movement calculation (matches Go backend)
export function calculateNewPosition(direction, currentRow, currentCol, gameMap, textGrid, preferredColumn) {
  if (!isValidDirection(direction)) {
    throw new Error(`invalid direction: ${direction}`);
  }
  
  let newRow = currentRow;
  let newCol = currentCol;
  let newPreferredColumn = preferredColumn;
  
  // Route to appropriate movement handler (same as above but without count)
  if (direction === "left" || direction === "right" || direction === "up" || direction === "down") {
    const result = handleBasicMovement(direction, currentRow, currentCol, preferredColumn, gameMap);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "line_end" || direction === "line_start" || direction === "line_first_non_blank" || direction === "line_last_non_blank") {
    const result = handleLineMovement(direction, currentRow, currentCol, gameMap, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "file_start" || direction === "file_end") {
    const result = handleFileMovement(direction, currentRow, currentCol, preferredColumn, gameMap);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "screen_top" || direction === "screen_middle" || direction === "screen_bottom") {
    const result = handleScreenMovement(direction, currentRow, currentCol, preferredColumn, gameMap);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "word_forward" || direction === "word_forward_space" || direction === "word_backward" || direction === "word_backward_space" || direction === "word_end" || direction === "word_end_space" || direction === "word_end_prev" || direction === "word_end_prev_space") {
    const result = handleWordMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "paragraph_prev" || direction === "paragraph_next") {
    const result = handleParagraphMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "sentence_prev" || direction === "sentence_next") {
    const result = handleSentenceMovement(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "repeat_char_search_same" || direction === "repeat_char_search_opposite" || 
             (direction.length > 17 && (direction.startsWith("find_char_forward") || direction.startsWith("till_char_forward"))) ||
             (direction.length > 18 && (direction.startsWith("find_char_backward") || direction.startsWith("till_char_backward")))) {
    const result = handleCharacterSearch(direction, currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else if (direction === "match_bracket") {
    const result = handleBracketMatching(currentRow, currentCol, textGrid);
    newRow = result.newRow;
    newCol = result.newCol;
    newPreferredColumn = result.newPreferredColumn;
  } else {
    throw new Error(`unknown direction: ${direction}`);
  }
  
  const isValid = isValidPosition(newRow, newCol, gameMap);
  
  // Check if position contains an enemy (block movement)
  let finalIsValid = isValid;
  if (isValid && gameMap[newRow][newCol] === ENEMY) {
    finalIsValid = false;
  }
  
  // Allow paragraph movements to stay at same position (like when at first/last paragraph)
  if (isValid && newRow === currentRow && newCol === currentCol) {
    // Don't invalidate paragraph movements that stay at same position
    if (direction !== "paragraph_prev" && direction !== "paragraph_next") {
      finalIsValid = false;
    }
  }
  
  return {
    newRow: newRow,
    newCol: newCol,
    preferredColumn: newPreferredColumn,
    isValid: finalIsValid
  };
}