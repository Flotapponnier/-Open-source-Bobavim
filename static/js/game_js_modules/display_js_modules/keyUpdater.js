import { clearKeyElements, addGameElement } from './displayHelpers.js';
import { DISPLAY_CONFIG } from '../constants_js_modules/display.js';
import { updateSpaceHighlightForKey } from '../spaceHighlight_js_modules/spaceHighlightVisibility.js';

export function updateKey(key, gameMap) {
  const row = parseInt(key.getAttribute("data-row"));
  const col = parseInt(key.getAttribute("data-col"));
  const oldMapValue = parseInt(key.getAttribute("data-map"));
  const newMapValue = gameMap[row][col];

  if (oldMapValue !== newMapValue) {
    key.setAttribute("data-map", newMapValue);
    const keyTop = key.querySelector(DISPLAY_CONFIG.CSS_CLASSES.KEY_TOP);

    clearKeyElements(keyTop);

    requestAnimationFrame(() => {
      // Before adding a player sprite, ensure no other player sprites exist
      if (newMapValue === DISPLAY_CONFIG.MAP_VALUES.BOBA) {
        preventDuplicatePlayerSprites(row, col);
        // Dispatch event for relative line numbers to update
        document.dispatchEvent(new CustomEvent('playerMoved', { 
          detail: { row, col } 
        }));
      }
      addGameElement(keyTop, newMapValue);
      
      // Update space highlighting for this key
      updateSpaceHighlightForKey(key);
    });
  }
}

// Prevent duplicate player sprites by removing any existing ones before adding new one
function preventDuplicatePlayerSprites(targetRow, targetCol) {
  const allKeys = document.querySelectorAll('.key');
  allKeys.forEach(key => {
    const keyRow = parseInt(key.getAttribute("data-row"));
    const keyCol = parseInt(key.getAttribute("data-col"));
    
    // If this is not the target position, remove any player sprites
    if (keyRow !== targetRow || keyCol !== targetCol) {
      const keyTop = key.querySelector(DISPLAY_CONFIG.CSS_CLASSES.KEY_TOP);
      if (keyTop) {
        const playerSprites = keyTop.querySelectorAll('.boba-character');
        playerSprites.forEach(sprite => sprite.remove());
      }
    }
  });
}

export function updateResponsiveScaling() {
  if (
    window.responsiveScaling &&
    window.responsiveScaling.updateScalingAfterMapChange
  ) {
    window.responsiveScaling.updateScalingAfterMapChange();
  }
}