// ================================
// TUTORIAL CONFIGURATION
// ================================

import { VALID_MOVEMENT_KEYS, MOVEMENT_KEYS } from "./movement.js";

export const TUTORIAL_CONFIG = {
  TOGGLE_KEY: "+",
  COLORS: {
    ACTIVATED: "#9b59b6",
    INSTRUCTION: "#3498db",
    CORRECT: "#27ae60",
    WRONG: "#e74c3c",
  },
  TIMINGS: {
    ACTIVATION_DELAY: 1000,
    NEXT_COMMAND_DELAY: 1000,
    WRONG_ANSWER_DISPLAY: 1000,
  },
  MESSAGES: {
    ACTIVATED: "TUTORIAL MODE ACTIVATED",
    DEACTIVATED: "TUTORIAL MODE DEACTIVATED",
    DEFAULT_WELCOME:
      "Welcome! Use HJKL to move | Space+M map | Space+T tutorial | Space+H help | Space+N numbers | Space+C chat | Space+Space highlight spaces",
  },
};

export const TUTORIAL_COMMANDS = VALID_MOVEMENT_KEYS
  .filter(key => key !== 'g') // Exclude single 'g' from tutorial
  .map((key) => ({
    key: key,
    message: `Press ${key} to go ${MOVEMENT_KEYS[key].description}`,
  }));
