// ================================
// DISPLAY MODULE CONFIGURATION
// ================================

export const DISPLAY_CONFIG = {
  MAP_VALUES: {
    EMPTY: 0,
    BOBA: 1,
    ENEMY: 2,
    PEARL: 3,
    PEARL_MOLD: 4,
  },
  SPRITES: {
    BOBA: "/static/sprites/character/boba.png",
    ENEMY: "/static/sprites/character/stop_boba.png",
    PEARL: "/static/sprites/character/pearl.png",
    PEARL_MOLD: "/static/sprites/character/pearl_mold.png",
    DIRECTORY: "/static/sprites/character/",
    SUFFIX: "_boba.png",
  },
  CSS_CLASSES: {
    BOBA_CHARACTER: "boba-character",
    BOBA_SHADOW: "boba-shadow",
    BOBA_SPRITE: "boba-sprite",
    ENEMY: "enemy",
    ENEMY_SHADOW: "enemy-shadow",
    ENEMY_SPRITE: "enemy-sprite",
    PEARL: "pearl",
    PEARL_SHADOW: "pearl-shadow",
    PEARL_SPRITE: "pearl-sprite",
    PEARL_MOLD: "pearl-mold",
    PEARL_MOLD_SHADOW: "pearl-mold-shadow",
    PEARL_MOLD_SPRITE: "pearl-mold-sprite",
    KEY_TOP: ".key-top",
  },
  SELECTORS: {
    GAME_ELEMENTS: ".boba-character, .enemy, .pearl, .pearl-mold",
  },
};

