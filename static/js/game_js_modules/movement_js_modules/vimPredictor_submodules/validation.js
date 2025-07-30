/**
 * Direction validation for Vim Movement Predictor
 * Handles validation and conversion of movement directions
 */

import { VALID_DIRECTIONS, MOVEMENT_KEY_TO_DIRECTION } from './constants.js';

// Direction validation (matches Go backend)
export function isValidDirection(direction) {
  if (VALID_DIRECTIONS[direction]) {
    return true;
  }
  
  // Check character search directions with character parameter
  if (direction.length === 19 && direction.startsWith("find_char_forward") && direction[17] === '_') {
    return true;
  }
  if (direction.length === 20 && direction.startsWith("find_char_backward") && direction[18] === '_') {
    return true;
  }
  if (direction.length === 19 && direction.startsWith("till_char_forward") && direction[17] === '_') {
    return true;
  }
  if (direction.length === 20 && direction.startsWith("till_char_backward") && direction[18] === '_') {
    return true;
  }
  
  return false;
}

// Validate and convert direction input (matches Go backend)
export function validateDirection(direction) {
  // Check if this is a character search direction
  if ((direction.length > 17 && direction.startsWith("find_char_forward")) ||
      (direction.length > 18 && direction.startsWith("find_char_backward")) ||
      (direction.length > 17 && direction.startsWith("till_char_forward")) ||
      (direction.length > 18 && direction.startsWith("till_char_backward"))) {
    return direction;
  }
  
  // Strip number prefix if present (e.g., "5j" -> "j", "123B" -> "B")
  let baseDirection = direction;
  for (let i = 0; i < direction.length; i++) {
    const char = direction[i];
    if (char < '0' || char > '9') {
      baseDirection = direction.slice(i);
      break;
    }
  }
  
  // For normal movement, look up in MOVEMENT_KEY_TO_DIRECTION map
  const mappedDirection = MOVEMENT_KEY_TO_DIRECTION[baseDirection];
  if (!mappedDirection) {
    throw new Error("invalid movement key");
  }
  
  return mappedDirection;
}