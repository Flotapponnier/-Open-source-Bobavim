import { getCharacterSpritePath } from "../../../shared/character_sprites.js";

export class GameMapRenderer {
  constructor(displayManager) {
    this.displayManager = displayManager;
    this.game = displayManager.game;
  }

  updateClientGameMap() {
    const p1Pos = this.game.clientGameState.player1?.position;
    const p2Pos = this.game.clientGameState.player2?.position;
    const pearlPos = this.game.clientGameState.pearl_position;
    
    logger.debug('🗺️ UPDATING CLIENT GAME MAP WITH POSITIONS:', {
      player1: p1Pos,
      player2: p2Pos,
      pearl: pearlPos
    });
    
    logger.debug('🎭 CHARACTER DATA IN updateClientGameMap:', {
      player1Character: this.game.clientGameState.player1?.character,
      player2Character: this.game.clientGameState.player2?.character,
      currentPlayerId: this.game.playerId,
      player1Id: this.game.clientGameState.player1?.id,
      player2Id: this.game.clientGameState.player2?.id
    });
    
    const gameMap = this.game.clientGameState.game_map;
    let clearedCells = 0;
    for (let row = 0; row < gameMap.length; row++) {
      for (let col = 0; col < gameMap[row].length; col++) {
        if (gameMap[row][col] === 1 || gameMap[row][col] === 2 || gameMap[row][col] === 3) {
          gameMap[row][col] = 0;
          clearedCells++;
        }
      }
    }
    logger.debug('🧹 Cleared', clearedCells, 'cells from game map');
    
    const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
    logger.debug('🎯 DETAILED PLAYER IDENTIFICATION:', {
      currentPlayerId: this.game.playerId,
      player1Id: this.game.clientGameState.player1?.id,
      player2Id: this.game.clientGameState.player2?.id,
      isPlayer1: isPlayer1,
      player1Character: this.game.clientGameState.player1?.character,
      player2Character: this.game.clientGameState.player2?.character,
      player1Position: this.game.clientGameState.player1?.position,
      player2Position: this.game.clientGameState.player2?.position
    });
    
    logger.debug('🎯 Setting positions - P1:', p1Pos, 'P2:', p2Pos, 'Pearl:', pearlPos);
    
    if (pearlPos && pearlPos.row >= 0 && pearlPos.row < gameMap.length && 
        pearlPos.col >= 0 && pearlPos.col < gameMap[pearlPos.row].length) {
      gameMap[pearlPos.row][pearlPos.col] = 3;
      logger.debug('✅ Set Pearl at', pearlPos);
    } else if (pearlPos) {
      logger.error('❌ Invalid Pearl position:', pearlPos);
    }
    
    if (isPlayer1) {
      logger.debug('🎯 SETTING P2 AS ENEMY (RED):', p2Pos);
      if (p2Pos && p2Pos.row >= 0 && p2Pos.row < gameMap.length && 
          p2Pos.col >= 0 && p2Pos.col < gameMap[p2Pos.row].length) {
        gameMap[p2Pos.row][p2Pos.col] = 2;
        logger.debug('✅ Set Enemy Player (P2) at', JSON.stringify(p2Pos), 'with RED color (value 2) - gameMap[' + p2Pos.row + '][' + p2Pos.col + '] = 2');
        logger.debug('🔍 VERIFICATION: gameMap[' + p2Pos.row + '][' + p2Pos.col + '] =', gameMap[p2Pos.row][p2Pos.col]);
      } else if (p2Pos) {
        logger.error('❌ Invalid Enemy Player (P2) position:', JSON.stringify(p2Pos));
        logger.error('❌ GameMap bounds:', gameMap.length, 'rows, row', p2Pos.row, 'has', gameMap[p2Pos.row]?.length, 'cols');
      }
      
      logger.debug('🎯 SETTING P1 AS CURRENT (GREEN):', p1Pos);
      if (p1Pos && p1Pos.row >= 0 && p1Pos.row < gameMap.length && 
          p1Pos.col >= 0 && p1Pos.col < gameMap[p1Pos.row].length) {
        gameMap[p1Pos.row][p1Pos.col] = 1;
        logger.debug('✅ Set Current Player (P1) at', JSON.stringify(p1Pos), 'with GREEN color (value 1) - gameMap[' + p1Pos.row + '][' + p1Pos.col + '] = 1');
        logger.debug('🔍 VERIFICATION: gameMap[' + p1Pos.row + '][' + p1Pos.col + '] =', gameMap[p1Pos.row][p1Pos.col]);
      } else if (p1Pos) {
        logger.error('❌ Invalid Current Player (P1) position:', JSON.stringify(p1Pos));
      }
    } else {
      logger.debug('🎯 SETTING P1 AS ENEMY (RED):', p1Pos);
      if (p1Pos && p1Pos.row >= 0 && p1Pos.row < gameMap.length && 
          p1Pos.col >= 0 && p1Pos.col < gameMap[p1Pos.row].length) {
        gameMap[p1Pos.row][p1Pos.col] = 2;
        logger.debug('✅ Set Enemy Player (P1) at', JSON.stringify(p1Pos), 'with RED color (value 2) - gameMap[' + p1Pos.row + '][' + p1Pos.col + '] = 2');
        logger.debug('🔍 VERIFICATION: gameMap[' + p1Pos.row + '][' + p1Pos.col + '] =', gameMap[p1Pos.row][p1Pos.col]);
      } else if (p1Pos) {
        logger.error('❌ Invalid Enemy Player (P1) position:', JSON.stringify(p1Pos));
        logger.error('❌ GameMap bounds:', gameMap.length, 'rows, row', p1Pos.row, 'has', gameMap[p1Pos.row]?.length, 'cols');
      }
      
      logger.debug('🎯 SETTING P2 AS CURRENT (GREEN):', p2Pos);
      if (p2Pos && p2Pos.row >= 0 && p2Pos.row < gameMap.length && 
          p2Pos.col >= 0 && p2Pos.col < gameMap[p2Pos.row].length) {
        gameMap[p2Pos.row][p2Pos.col] = 1;
        logger.debug('✅ Set Current Player (P2) at', JSON.stringify(p2Pos), 'with GREEN color (value 1) - gameMap[' + p2Pos.row + '][' + p2Pos.col + '] = 1');
        logger.debug('🔍 VERIFICATION: gameMap[' + p2Pos.row + '][' + p2Pos.col + '] =', gameMap[p2Pos.row][p2Pos.col]);
      } else if (p2Pos) {
        logger.error('❌ Invalid Current Player (P2) position:', JSON.stringify(p2Pos));
      }
    }
    
    logger.debug('✅ Game map updated with color-coded positions (1=current/green, 2=enemy/red, 3=pearl)');
  }

  updateGameMapOptimized() {
    if (!this.game.clientGameState || !this.game.clientGameState.text_grid || !this.game.clientGameState.game_map) {
      logger.error('❌ Cannot update map - missing game state data');
      return;
    }

    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement || mapElement.children.length === 0) {
      this.updateGameMap();
      return;
    }

    const p1Pos = this.game.clientGameState.player1?.position;
    const p2Pos = this.game.clientGameState.player2?.position;
    const pearlPos = this.game.clientGameState.pearl_position;
    
    const p1Changed = !this.displayManager.displayUtils.positionsEqual(this.game.lastRenderedPositions.player1, p1Pos);
    const p2Changed = !this.displayManager.displayUtils.positionsEqual(this.game.lastRenderedPositions.player2, p2Pos);
    const pearlChanged = !this.displayManager.displayUtils.positionsEqual(this.game.lastRenderedPositions.pearl, pearlPos);
    
    logger.debug('🔍 Position changes - P1:', p1Changed, 'P2:', p2Changed, 'Pearl:', pearlChanged);
    
    if (!p1Changed && !p2Changed && !pearlChanged) {
      logger.debug('⚡ No position changes, skipping ALL updates for maximum efficiency');
      return;
    }
    
    logger.debug('🚀 OPTIMIZED UPDATE - only redrawing changed elements:', {
      p1Changed, p2Changed, pearlChanged
    });
    
    if (this.displayManager.needsInitialCleanup) {
      logger.debug('🔄 Performing initial cleanup of static positions');
      this.displayManager.displayUtils.clearAllStaticHighlights();
      this.displayManager.needsInitialCleanup = false;
    }
    
    const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
    
    if (p1Changed) {
      if (this.game.lastRenderedPositions.player1) {
        this.displayManager.spriteManager.clearPositionSprite(this.game.lastRenderedPositions.player1, 'player1');
        logger.debug('🧹 Cleared P1 from old position:', this.game.lastRenderedPositions.player1);
      }
      
      if (p1Pos) {
        const p1Character = this.game.clientGameState.player1?.character || 'boba';
        if (isPlayer1) {
          logger.debug('✅ P1 → Current (GREEN):', p1Character);
          this.displayManager.spriteManager.addSpriteAtPosition(p1Pos.row, p1Pos.col, 'current', p1Character);
        } else {
          logger.debug('🔴 P1 → Enemy (RED):', p1Character);
          this.displayManager.spriteManager.addSpriteAtPosition(p1Pos.row, p1Pos.col, 'enemy', p1Character);
        }
      }
      this.game.lastRenderedPositions.player1 = p1Pos ? { ...p1Pos } : null;
    }
    
    if (p2Changed) {
      if (this.game.lastRenderedPositions.player2) {
        this.displayManager.spriteManager.clearPositionSprite(this.game.lastRenderedPositions.player2, 'player2');
        logger.debug('🧹 Cleared P2 from old position:', this.game.lastRenderedPositions.player2);
      }
      
      if (p2Pos) {
        const p2Character = this.game.clientGameState.player2?.character || 'boba';
        if (isPlayer1) {
          logger.debug('🔴 P2 → Enemy (RED):', p2Character);
          this.displayManager.spriteManager.addSpriteAtPosition(p2Pos.row, p2Pos.col, 'enemy', p2Character);
        } else {
          logger.debug('✅ P2 → Current (GREEN):', p2Character);
          this.displayManager.spriteManager.addSpriteAtPosition(p2Pos.row, p2Pos.col, 'current', p2Character);
        }
      }
      this.game.lastRenderedPositions.player2 = p2Pos ? { ...p2Pos } : null;
    }
    
    if (pearlChanged) {
      if (this.game.lastRenderedPositions.pearl) {
        this.displayManager.spriteManager.clearPositionSprite(this.game.lastRenderedPositions.pearl, 'pearl');
        logger.debug('🧹 Cleared Pearl from old position:', this.game.lastRenderedPositions.pearl);
      }
      
      if (pearlPos) {
        logger.debug('💎 Pearl moved to:', pearlPos);
        this.displayManager.spriteManager.addSpriteAtPosition(pearlPos.row, pearlPos.col, 'pearl');
      }
      this.game.lastRenderedPositions.pearl = pearlPos ? { ...pearlPos } : null;
    }
  }

  updateGameMap() {
    if (!this.game.clientGameState || !this.game.clientGameState.text_grid || !this.game.clientGameState.game_map) {
      logger.error('❌ Cannot update map - missing game state data');
      return;
    }

    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement) {
      logger.error('❌ Cannot find multiplayer-game-map element');
      return;
    }

    logger.debug('🗺️ UPDATING VISUAL MAP - clearing and rebuilding');
    logger.debug('🎯 Current positions - P1:', JSON.stringify(this.game.clientGameState.player1?.position), 'P2:', JSON.stringify(this.game.clientGameState.player2?.position), 'Pearl:', JSON.stringify(this.game.clientGameState.pearl_position));
    
    const gameMap = this.game.clientGameState.game_map;
    const p1Pos = this.game.clientGameState.player1?.position;
    const p2Pos = this.game.clientGameState.player2?.position;
    
    logger.debug('🗺️ MAP VALUES AT POSITIONS:');
    if (p1Pos && gameMap[p1Pos.row] && gameMap[p1Pos.row][p1Pos.col] !== undefined) {
      logger.debug(`P1 position (${p1Pos.row},${p1Pos.col}) has map value: ${gameMap[p1Pos.row][p1Pos.col]}`);
    }
    if (p2Pos && gameMap[p2Pos.row] && gameMap[p2Pos.row][p2Pos.col] !== undefined) {
      logger.debug(`P2 position (${p2Pos.row},${p2Pos.col}) has map value: ${gameMap[p2Pos.row][p2Pos.col]}`);
    }
    
    mapElement.innerHTML = '';

    const textGrid = this.game.clientGameState.text_grid;
    
    let actualPlayer1RenderedCount = 0;
    let actualPlayer2RenderedCount = 0;
    let pearlRenderedCount = 0;
    
    textGrid.forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'keyboard-row';

      row.forEach((letter, colIndex) => {
        const keyDiv = document.createElement('div');
        keyDiv.className = 'key';
        keyDiv.setAttribute('data-letter', letter);
        keyDiv.setAttribute('data-row', rowIndex);
        keyDiv.setAttribute('data-col', colIndex);

        const mapValue = gameMap[rowIndex] && gameMap[rowIndex][colIndex] ? gameMap[rowIndex][colIndex] : 0;
        keyDiv.setAttribute('data-map', mapValue);

        const keyTop = document.createElement('div');
        keyTop.className = 'key-top';

        const keyLetter = document.createElement('span');
        keyLetter.className = 'key-letter';
        keyLetter.textContent = letter;
        keyTop.appendChild(keyLetter);

        if (mapValue === 1) {
          const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
          const currentPlayerData = isPlayer1 ? this.game.clientGameState.player1 : this.game.clientGameState.player2;
          
          const character = currentPlayerData?.character;
          
          logger.debug(`🎮 Rendering CURRENT PLAYER (GREEN) at (${rowIndex}, ${colIndex}) with character: ${character}, PlayerID: ${this.game.playerId}, IsPlayer1: ${isPlayer1}`);
          
          const playerDiv = document.createElement('div');
          playerDiv.className = 'boba-character current-player-character';
          
          const shadow = document.createElement('div');
          shadow.className = 'boba-shadow';
          playerDiv.appendChild(shadow);
          
          const sprite = document.createElement('img');
          sprite.className = 'boba-sprite';
          sprite.alt = 'Current Player';
          sprite.src = getCharacterSpritePath(character || 'boba');
          
          playerDiv.appendChild(sprite);
          keyTop.appendChild(playerDiv);
          
          if (isPlayer1) {
            actualPlayer1RenderedCount++;
          } else {
            actualPlayer2RenderedCount++;
          }
        } else if (mapValue === 2) {
          const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
          const enemyPlayerData = isPlayer1 ? this.game.clientGameState.player2 : this.game.clientGameState.player1;
          
          const character = enemyPlayerData?.character;
          
          logger.debug(`🎮 Rendering ENEMY PLAYER (RED) at (${rowIndex}, ${colIndex}) with character: ${character}, EnemyPlayerID: ${isPlayer1 ? this.game.clientGameState.player2?.id : this.game.clientGameState.player1?.id}, IsPlayer1Enemy: ${!isPlayer1}`);
          
          const playerDiv = document.createElement('div');
          playerDiv.className = 'boba-character enemy-player-character';
          
          const shadow = document.createElement('div');
          shadow.className = 'boba-shadow';
          playerDiv.appendChild(shadow);
          
          const sprite = document.createElement('img');
          sprite.className = 'boba-sprite';
          sprite.alt = 'Enemy Player';
          sprite.src = getCharacterSpritePath(character || 'boba');
          
          playerDiv.appendChild(sprite);
          keyTop.appendChild(playerDiv);
          
          if (isPlayer1) {
            actualPlayer2RenderedCount++;
          } else {
            actualPlayer1RenderedCount++;
          }
        } else if (mapValue === 3) {
          logger.debug(`💎 Rendering Pearl sprite at (${rowIndex}, ${colIndex})`);
          const pearlDiv = document.createElement('div');
          pearlDiv.className = 'pearl';
          
          const shadow = document.createElement('div');
          shadow.className = 'pearl-shadow';
          pearlDiv.appendChild(shadow);
          
          const sprite = document.createElement('img');
          sprite.className = 'pearl-sprite';
          sprite.src = '/static/sprites/character/pearl.png';
          sprite.alt = 'Pearl';
          
          pearlDiv.appendChild(sprite);
          keyTop.appendChild(pearlDiv);
          pearlRenderedCount++;
        }

        keyDiv.appendChild(keyTop);
        rowDiv.appendChild(keyDiv);
      });

      mapElement.appendChild(rowDiv);
    });
    
    logger.debug(`🎯 RENDER SUMMARY: Actual P1=${actualPlayer1RenderedCount}, Actual P2=${actualPlayer2RenderedCount}, Pearl=${pearlRenderedCount}`);
    logger.debug('🔍 Map element child count:', mapElement.children.length);
  }
}