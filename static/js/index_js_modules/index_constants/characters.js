// ================================
// CHARACTER SELECTION CONFIGURATION
// ================================

export const CHARACTER_CONFIG = {
  DEFAULT: "boba",
  PREMIUM: ["golden", "black"],
  LOCKED: ["boba_diamond"],
  ICONS: {
    LOCK: "🔒",
    DIAMOND: "💎",
  },
  CSS_CLASSES: {
    CHARACTER_BOX: "character-box",
    LOCKED: "locked",
    UNLOCKED: "unlocked",
    SELECTED: "selected",
    LOCK_ICON: "lock-icon",
  },
  SELECTORS: {
    CHARACTER_BOXES: ".character-box",
    GOLDEN_BOX: '[data-character="golden"]',
    BLACK_BOX: '[data-character="black"]',
    DIAMOND_BOX: '[data-character="boba_diamond"]',
    LOCK_ICON: ".lock-icon",
  },
};

