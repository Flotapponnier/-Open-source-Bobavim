import { getCharacterSpritePath } from "../../../shared/character_sprites.js";
import { updateSpaceHighlightForKey } from "../../../game_js_modules/spaceHighlight_js_modules/spaceHighlightVisibility.js";

export class UIUpdater {
  constructor(displayManager) {
    this.displayManager = displayManager;
    this.game = displayManager.game;
  }

  updateScoresAndDebug() {
    if (!this.game.clientGameState) return;
    
    const p1Score = document.getElementById('player1-score');
    const p2Score = document.getElementById('player2-score');
    
    if (p1Score) p1Score.textContent = this.game.clientGameState.player1?.score || 0;
    if (p2Score) p2Score.textContent = this.game.clientGameState.player2?.score || 0;

    const lastUpdateElement = document.getElementById('debug-last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
  }

  updateDebugInfo() {
    const gameIdElement = document.getElementById('debug-game-id');
    if (gameIdElement) {
      gameIdElement.textContent = this.game.gameId || 'Loading...';
    }
    
    const mapNameElement = document.getElementById('current-map-name');
    if (mapNameElement && this.game.clientGameState?.map) {
      mapNameElement.textContent = this.game.clientGameState.map.name || 'Unknown';
    }
    
    if (this.game.clientGameState) {
      const p1PosElement = document.getElementById('debug-player1-pos');
      const p2PosElement = document.getElementById('debug-player2-pos');
      const pearlPosElement = document.getElementById('debug-pearl-pos');
      
      if (p1PosElement && this.game.clientGameState.player1?.position) {
        p1PosElement.textContent = `(${this.game.clientGameState.player1.position.row}, ${this.game.clientGameState.player1.position.col})`;
      }
      if (p2PosElement && this.game.clientGameState.player2?.position) {
        p2PosElement.textContent = `(${this.game.clientGameState.player2.position.row}, ${this.game.clientGameState.player2.position.col})`;
      }
      if (pearlPosElement && this.game.clientGameState.pearl_position) {
        pearlPosElement.textContent = `(${this.game.clientGameState.pearl_position.row}, ${this.game.clientGameState.pearl_position.col})`;
      }
    }
    
    const wsStatusElement = document.getElementById('debug-websocket');
    if (wsStatusElement) {
      wsStatusElement.textContent = this.game.websocket ? 'Connected' : 'Disconnected';
    }
    
    const lastUpdateElement = document.getElementById('debug-last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
  }

  updateKeyHighlight(row, col, mapValue) {
    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement) return;
    
    const keyElement = mapElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (keyElement) {
      keyElement.setAttribute('data-map', mapValue);
      // Update space highlighting for this key
      updateSpaceHighlightForKey(keyElement);
    } else {
      logger.warn(`Could not find key element for highlight at (${row}, ${col})`);
    }
  }

  updatePlayerAvatars() {
    if (this.game.clientGameState.player1?.character) {
      const p1Avatar = document.getElementById('player1-character');
      if (p1Avatar) {
        p1Avatar.src = getCharacterSpritePath(this.game.clientGameState.player1.character);
      }
    }
    if (this.game.clientGameState.player2?.character) {
      const p2Avatar = document.getElementById('player2-character');
      if (p2Avatar) {
        p2Avatar.src = getCharacterSpritePath(this.game.clientGameState.player2.character);
      }
    }
  }

  updatePlayerNames() {
    document.getElementById('player1-username').textContent = this.game.clientGameState.player1?.username || 'Player 1';
    document.getElementById('player2-username').textContent = this.game.clientGameState.player2?.username || 'Player 2';
  }

  updateScores() {
    document.getElementById('player1-score').textContent = this.game.clientGameState.player1?.score || 0;
    document.getElementById('player2-score').textContent = this.game.clientGameState.player2?.score || 0;
  }
}