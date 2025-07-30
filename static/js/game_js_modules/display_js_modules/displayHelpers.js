import { DISPLAY_CONFIG } from '../constants_js_modules/display.js';
import { applyVisibilityToElement } from '../movement_js_modules/spriteVisibility.js';
import { getCharacterSpritePath } from '../../shared/character_sprites.js';

export function clearKeyElements(keyTop) {
  // Only remove elements using the standard selector - this is sufficient for normal operation
  const existingElements = keyTop.querySelectorAll(DISPLAY_CONFIG.SELECTORS.GAME_ELEMENTS);
  existingElements.forEach((element) => {
    element.remove();
  });
}

export function createBobaElement() {
  const bobaDiv = document.createElement("div");
  bobaDiv.className = DISPLAY_CONFIG.CSS_CLASSES.BOBA_CHARACTER;

  const character = window.selectedCharacter || "boba";
  const spriteUrl = getCharacterSpritePath(character);

  bobaDiv.innerHTML = `
    <div class="${DISPLAY_CONFIG.CSS_CLASSES.BOBA_SHADOW}"></div>
    <img src="${spriteUrl}" alt="${character} Boba" class="${DISPLAY_CONFIG.CSS_CLASSES.BOBA_SPRITE}">
  `;

  return bobaDiv;
}

export function createPearlElement() {
  const pearlDiv = document.createElement("div");
  pearlDiv.className = DISPLAY_CONFIG.CSS_CLASSES.PEARL;
  pearlDiv.innerHTML = `
    <div class="${DISPLAY_CONFIG.CSS_CLASSES.PEARL_SHADOW}"></div>
    <img src="${DISPLAY_CONFIG.SPRITES.PEARL}" alt="Pearl" class="${DISPLAY_CONFIG.CSS_CLASSES.PEARL_SPRITE}">
  `;

  return pearlDiv;
}

export function createEnemyElement() {
  const enemyDiv = document.createElement("div");
  enemyDiv.className = DISPLAY_CONFIG.CSS_CLASSES.ENEMY;
  enemyDiv.innerHTML = `
    <div class="${DISPLAY_CONFIG.CSS_CLASSES.ENEMY_SHADOW}"></div>
    <img src="${DISPLAY_CONFIG.SPRITES.ENEMY}" alt="Enemy" class="${DISPLAY_CONFIG.CSS_CLASSES.ENEMY_SPRITE}">
  `;

  return enemyDiv;
}

export function createPearlMoldElement() {
  const pearlMoldDiv = document.createElement("div");
  pearlMoldDiv.className = DISPLAY_CONFIG.CSS_CLASSES.PEARL_MOLD;
  pearlMoldDiv.innerHTML = `
    <div class="${DISPLAY_CONFIG.CSS_CLASSES.PEARL_MOLD_SHADOW}"></div>
    <img src="${DISPLAY_CONFIG.SPRITES.PEARL_MOLD}" alt="Pearl Mold" class="${DISPLAY_CONFIG.CSS_CLASSES.PEARL_MOLD_SPRITE}">
  `;

  return pearlMoldDiv;
}

export function addGameElement(keyTop, mapValue) {
  if (mapValue === DISPLAY_CONFIG.MAP_VALUES.BOBA) {
    const bobaElement = createBobaElement();
    applyVisibilityToElement(bobaElement);
    keyTop.appendChild(bobaElement);
  } else if (mapValue === DISPLAY_CONFIG.MAP_VALUES.ENEMY) {
    const enemyElement = createEnemyElement();
    applyVisibilityToElement(enemyElement);
    keyTop.appendChild(enemyElement);
  } else if (mapValue === DISPLAY_CONFIG.MAP_VALUES.PEARL) {
    const pearlElement = createPearlElement();
    applyVisibilityToElement(pearlElement);
    keyTop.appendChild(pearlElement);
  } else if (mapValue === DISPLAY_CONFIG.MAP_VALUES.PEARL_MOLD) {
    const pearlMoldElement = createPearlMoldElement();
    applyVisibilityToElement(pearlMoldElement);
    keyTop.appendChild(pearlMoldElement);
  }
}

// Targeted cleanup function to remove only duplicate/orphaned player sprites
export function cleanupOrphanedPlayerSprites(gameMap) {
  // First, find where the player should be according to the game map
  let playerRow = -1;
  let playerCol = -1;
  
  for (let row = 0; row < gameMap.length; row++) {
    for (let col = 0; col < gameMap[row].length; col++) {
      if (gameMap[row][col] === DISPLAY_CONFIG.MAP_VALUES.BOBA) {
        playerRow = row;
        playerCol = col;
        break;
      }
    }
    if (playerRow !== -1) break;
  }
  
  // Now check all keys for player sprites
  const allKeys = document.querySelectorAll('.key');
  allKeys.forEach(key => {
    const keyRow = parseInt(key.dataset.row);
    const keyCol = parseInt(key.dataset.col);
    const keyTop = key.querySelector('.key-top');
    
    if (keyTop) {
      const playerSprites = keyTop.querySelectorAll('.boba-character');
      
      // If this key shouldn't have a player sprite but has one, remove it
      if (playerSprites.length > 0 && (keyRow !== playerRow || keyCol !== playerCol)) {
        logger.debug(`Removing orphaned player sprite at (${keyRow}, ${keyCol}), player should be at (${playerRow}, ${playerCol})`);
        playerSprites.forEach(sprite => sprite.remove());
      }
      
      // If this key has multiple player sprites, remove all but one
      if (playerSprites.length > 1) {
        logger.debug(`Removing ${playerSprites.length - 1} duplicate player sprites at (${keyRow}, ${keyCol})`);
        for (let i = 1; i < playerSprites.length; i++) {
          playerSprites[i].remove();
        }
      }
    }
  });
}