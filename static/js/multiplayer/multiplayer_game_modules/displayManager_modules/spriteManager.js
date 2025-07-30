import { getCharacterSpritePath } from "../../../shared/character_sprites.js";

export class SpriteManager {
  constructor(displayManager) {
    this.displayManager = displayManager;
    this.game = displayManager.game;
  }

  addSpriteAtPosition(row, col, type, character = null) {
    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement) return;
    
    const keyElement = mapElement.querySelector(`[data-row="${row}"][data-col="${col}"] .key-top`);
    if (!keyElement) {
      logger.warn(`Could not find key element at (${row}, ${col})`);
      return;
    }
    
    if (type === 'current') {
      this.createPlayerSprite(keyElement, row, col, 'current-player-character', 'Current Player', character, '1');
    } else if (type === 'enemy') {
      this.createPlayerSprite(keyElement, row, col, 'enemy-player-character', 'Enemy Player', character, '2');
    } else if (type === 'pearl') {
      this.createPearlSprite(keyElement, row, col);
    }
  }

  createPlayerSprite(keyElement, row, col, className, altText, character, mapValue) {
    logger.debug(`🎮 Adding ${altText} sprite at (${row}, ${col}) with character: ${character || 'boba'}`);
    const playerDiv = document.createElement('div');
    playerDiv.className = `boba-character ${className}`;
    
    const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
    const playerNumber = (className === 'current-player-character') 
      ? (isPlayer1 ? '1' : '2') 
      : (isPlayer1 ? '2' : '1');
    
    playerDiv.setAttribute('data-player', playerNumber);
    playerDiv.setAttribute('data-character', character || 'boba');
    
    const shadow = document.createElement('div');
    shadow.className = 'boba-shadow';
    playerDiv.appendChild(shadow);
    
    const sprite = document.createElement('img');
    sprite.className = 'boba-sprite';
    sprite.alt = altText;
    sprite.src = getCharacterSpritePath(character || 'boba');
    
    playerDiv.appendChild(sprite);
    keyElement.appendChild(playerDiv);
    
    this.displayManager.uiUpdater.updateKeyHighlight(row, col, mapValue);
  }

  createPearlSprite(keyElement, row, col) {
    logger.debug(`💎 Adding Pearl sprite at (${row}, ${col})`);
    const pearlDiv = document.createElement('div');
    pearlDiv.className = 'pearl';
    pearlDiv.setAttribute('data-type', 'pearl');
    
    const shadow = document.createElement('div');
    shadow.className = 'pearl-shadow';
    pearlDiv.appendChild(shadow);
    
    const sprite = document.createElement('img');
    sprite.className = 'pearl-sprite';
    sprite.src = '/static/sprites/character/pearl.png';
    sprite.alt = 'Pearl';
    
    pearlDiv.appendChild(sprite);
    keyElement.appendChild(pearlDiv);
    
    this.displayManager.uiUpdater.updateKeyHighlight(row, col, '3');
  }

  clearPositionSprite(position, spriteType = 'all') {
    if (!position) return;
    
    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement) return;
    
    const keyElement = mapElement.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`);
    if (keyElement) {
      if (spriteType === 'all') {
        const sprites = keyElement.querySelectorAll('.boba-character, .pearl');
        sprites.forEach(sprite => sprite.remove());
        keyElement.setAttribute('data-map', '0');
      } else if (spriteType === 'player1') {
        const sprites = keyElement.querySelectorAll('.boba-character[data-player="1"]');
        sprites.forEach(sprite => sprite.remove());
        logger.debug('🧹 Removed Player 1 sprite');
      } else if (spriteType === 'player2') {
        const sprites = keyElement.querySelectorAll('.boba-character[data-player="2"]');
        sprites.forEach(sprite => sprite.remove());
        logger.debug('🧹 Removed Player 2 sprite');
      } else if (spriteType === 'pearl') {
        const sprites = keyElement.querySelectorAll('.pearl');
        sprites.forEach(sprite => sprite.remove());
        logger.debug('🧹 Removed Pearl sprite');
      }
      
      this.updateMapValueBasedOnSprites(keyElement);
    }
  }

  updateMapValueBasedOnSprites(keyElement) {
    const hasPlayer1 = keyElement.querySelector('.boba-character[data-player="1"]');
    const hasPlayer2 = keyElement.querySelector('.boba-character[data-player="2"]');
    const hasPearl = keyElement.querySelector('.pearl');
    const isCurrentPlayer = keyElement.querySelector('.current-player-character');
    
    if (isCurrentPlayer) {
      keyElement.setAttribute('data-map', '1');
    } else if (hasPlayer1 || hasPlayer2) {
      keyElement.setAttribute('data-map', '2');
    } else if (hasPearl) {
      keyElement.setAttribute('data-map', '3');
    } else {
      keyElement.setAttribute('data-map', '0');
    }
  }
}