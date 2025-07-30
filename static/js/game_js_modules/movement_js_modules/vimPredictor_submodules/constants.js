/**
 * Constants for Vim Movement Predictor
 * Contains direction mappings and game constants that match the Go backend
 */

// Import existing constants from the game modules
import { DISPLAY_CONFIG } from '../../constants_js_modules/display.js';
import { MOVEMENT_KEYS as FRONTEND_MOVEMENT_KEYS, VALID_MOVEMENT_KEYS, NUMBER_PREFIX_CONFIG } from '../../constants_js_modules/movement.js';

// Game map values (use existing constants)
export const { EMPTY, BOBA: PLAYER, ENEMY, PEARL } = DISPLAY_CONFIG.MAP_VALUES;

// Create mapping from frontend movement keys to backend direction names
// This converts the frontend keys (like "h", "w", etc.) to backend directions (like "left", "word_forward")
export const MOVEMENT_KEY_TO_DIRECTION = {
  // Basic movements
  "h": "left",
  "j": "down", 
  "k": "up",
  "l": "right",
  "ArrowLeft": "left",
  "ArrowDown": "down",
  "ArrowUp": "up", 
  "ArrowRight": "right",
  
  // Word movements
  "w": "word_forward",
  "W": "word_forward_space",
  "b": "word_backward",
  "B": "word_backward_space",
  "e": "word_end",
  "E": "word_end_space",
  "ge": "word_end_prev",
  "gE": "word_end_prev_space",
  
  // Line movements
  "$": "line_end",
  "0": "line_start",
  "^": "line_first_non_blank",
  "g_": "line_last_non_blank",
  
  // File movements
  "gg": "file_start",
  "G": "file_end",
  
  // Screen movements
  "H": "screen_top",
  "M": "screen_middle",
  "L": "screen_bottom",
  
  // Paragraph movements
  "{": "paragraph_prev",
  "}": "paragraph_next",
  
  // Sentence movements
  "(": "sentence_prev",
  ")": "sentence_next",
  
  // Character search
  "f": "find_char_forward",
  "F": "find_char_backward", 
  "t": "till_char_forward",
  "T": "till_char_backward",
  ";": "repeat_char_search_same",
  ",": "repeat_char_search_opposite",
  
  // Bracket matching
  "%": "match_bracket"
};

// Valid directions map (matches Go backend)
export const VALID_DIRECTIONS = {
  "left": true,
  "right": true,
  "up": true,
  "down": true,
  "word_forward": true,
  "word_forward_space": true,
  "word_backward": true,
  "word_backward_space": true,
  "word_end": true,
  "word_end_space": true,
  "word_end_prev": true,
  "word_end_prev_space": true,
  "line_end": true,
  "line_start": true,
  "line_first_non_blank": true,
  "line_last_non_blank": true,
  "file_start": true,
  "file_end": true,
  "screen_top": true,
  "screen_middle": true,
  "screen_bottom": true,
  "paragraph_prev": true,
  "paragraph_next": true,
  "sentence_prev": true,
  "sentence_next": true,
  "find_char_forward": true,
  "find_char_backward": true,
  "till_char_forward": true,
  "till_char_backward": true,
  "repeat_char_search_same": true,
  "repeat_char_search_opposite": true,
  "match_bracket": true
};

// Re-export existing constants for convenience
export { VALID_MOVEMENT_KEYS, NUMBER_PREFIX_CONFIG };