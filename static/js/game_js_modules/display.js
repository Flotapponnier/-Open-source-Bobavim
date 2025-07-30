import { updateKey, updateResponsiveScaling } from './display_js_modules/keyUpdater.js';
import { updateScore } from './display_js_modules/scoreDisplay.js';
import { cleanupOrphanedPlayerSprites } from './display_js_modules/displayHelpers.js';

let cleanupCounter = 0;

export function updateGameDisplay(gameMap) {
  const keys = document.querySelectorAll(window.UI_SELECTORS.GAME_KEYS);

  keys.forEach((key) => {
    updateKey(key, gameMap);
  });

  
  // Run targeted cleanup every 5 display updates to prevent orphaned player sprites
  cleanupCounter++;
  if (cleanupCounter >= 5) {
    cleanupOrphanedPlayerSprites(gameMap);
    cleanupCounter = 0;
  }
  
  // Don't update scaling on every game display update - only on map changes
}

export { updateScore, cleanupOrphanedPlayerSprites };