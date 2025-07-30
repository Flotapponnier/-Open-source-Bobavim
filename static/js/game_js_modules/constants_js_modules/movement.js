// ================================
// MOVEMENT CONFIGURATION
// ================================

export const MOVEMENT_KEYS = {
  // Character & line movement
  h: { direction: "h", description: "LEFT ←" },
  j: { direction: "j", description: "DOWN ↓" },
  k: { direction: "k", description: "UP ↑" },
  l: { direction: "l", description: "RIGHT →" },

  // Arrow keys (NOOB mode with penalty)
  ArrowLeft: { direction: "ArrowLeft", description: "NOOB: LEFT ←" },
  ArrowDown: { direction: "ArrowDown", description: "NOOB: DOWN ↓" },
  ArrowUp: { direction: "ArrowUp", description: "NOOB: UP ↑" },
  ArrowRight: { direction: "ArrowRight", description: "NOOB: RIGHT →" },

  // Word motions
  w: { direction: "w", description: "WORD FORWARD →" },
  W: { direction: "W", description: "WORD FORWARD (space-separated) →" },
  b: { direction: "b", description: "WORD BACK ←" },
  B: { direction: "B", description: "WORD BACK (space-separated) ←" },
  e: { direction: "e", description: "END WORD →" },
  E: { direction: "E", description: "END WORD (space-separated) →" },
  ge: { direction: "ge", description: "END PREV WORD ←" },
  gE: { direction: "gE", description: "END PREV WORD (non-blank sequence) ←" },

  // Line motions
  0: { direction: "0", description: "LINE START ←" },
  $: { direction: "$", description: "LINE END →" },
  "^": { direction: "^", description: "FIRST NON-BLANK CHAR ←" },
  g_: { direction: "g_", description: "LAST NON-BLANK CHAR →" },

  // Screen positions
  H: { direction: "H", description: "TOP OF SCREEN" },
  M: { direction: "M", description: "MIDDLE OF SCREEN" },
  L: { direction: "L", description: "BOTTOM OF SCREEN" },

  // Paragraphs
  "{": { direction: "{", description: "PREV PARAGRAPH ←" },
  "}": { direction: "}", description: "NEXT PARAGRAPH →" },

  // Sentences
  "(": { direction: "(", description: "PREV SENTENCE ←" },
  ")": { direction: ")", description: "NEXT SENTENCE →" },

  // File
  g: {
    direction: "g",
    description: "g combination pressed",
  },
  gg: { direction: "gg", description: "TOP OF FILE" },
  G: { direction: "G", description: "END OF FILE" },

  // Character search (line local)
  f: { direction: "f<char>", description: "FIND CHAR →" },
  F: { direction: "F<char>", description: "FIND CHAR ←" },
  t: { direction: "t<char>", description: "TILL CHAR →" },
  T: { direction: "T<char>", description: "TILL CHAR ←" },
  ";": { direction: ";", description: "REPEAT SEARCH" },
  ",": { direction: ",", description: "REVERSE REPEAT SEARCH" },

  // Match
  "%": { direction: "%", description: "MATCHING BRACKET" },
};

// Generate movement messages dynamically
export const MOVEMENT_MESSAGES = Object.fromEntries(
  Object.entries(MOVEMENT_KEYS).map(([key, config]) => [
    key,
    `You pressed ${key} to go ${config.description}`,
  ]),
);

export const BLOCKED_MESSAGES = Object.fromEntries(
  Object.entries(MOVEMENT_KEYS).map(([key, config]) => [
    key,
    `You pressed ${key} to go ${config.description} - BLOCKED!`,
  ]),
);

// Get list of valid movement keys
export const VALID_MOVEMENT_KEYS = Object.keys(MOVEMENT_KEYS);

// Number prefix constants
export const NUMBER_PREFIX_CONFIG = {
  MAX_DIGITS: 4, // Prevent extremely large numbers
  DEFAULT_COUNT: 1,
  DISPLAY_PREFIX: "Type number: ",
};
