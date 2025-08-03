import { predictMovement } from "../../../game_js_modules/movement_js_modules/vimMovementPredictor.js";
import { gameSoundEffectsManager } from "../../../game_js_modules/gameSoundEffects.js";

export class ClientPredictor {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
    this.moveSequence = 0;
  }

  async processMoveWithPrediction(direction, count = 1, hasExplicitCount = false) {
    // Fast validation - exit early if not possible
    if (!this.game.isConnected || !this.game.clientGameState || this.game.countdownActive) {
      if (this.game.countdownActive) {
        this.movementProcessor.moveQueue.showMoveBlocked(direction);
      }
      return;
    }

    if (!this.game.clientGameState.text_grid || !this.game.clientGameState.game_map) {
      return;
    }

    const moveId = this.moveSequence++;
    const isPlayer1 = this.game.playerId === this.game.clientGameState.player1.id;
    const currentPlayer = isPlayer1 ? this.game.clientGameState.player1 : this.game.clientGameState.player2;
    
    if (!currentPlayer || !currentPlayer.position) {
      logger.error('Cannot process move - invalid player data');
      return;
    }
    
    const currentPos = currentPlayer.position;

    try {
      // Fast prediction with minimal logging
      const prediction = predictMovement(
        direction,
        currentPos.row,
        currentPos.col,
        this.game.clientGameState.game_map,
        this.game.clientGameState.text_grid,
        this.game.preferredColumn,
        count,
        hasExplicitCount
      );

      if (prediction.success && prediction.finalPosition) {
        this.applyPrediction(prediction, currentPlayer, moveId, direction, count, hasExplicitCount);
      } else {
        this.movementProcessor.moveQueue.showMoveBlocked(direction);
        gameSoundEffectsManager.playBlockedMovementSound();
      }
    } catch (error) {
      this.movementProcessor.moveQueue.showMoveBlocked(direction);
      gameSoundEffectsManager.playBlockedMovementSound();
    }
  }

  applyPrediction(prediction, currentPlayer, moveId, direction, count, hasExplicitCount) {
    const newPos = prediction.finalPosition;
    
    // Preserve character state
    const player1Character = this.game.clientGameState.player1?.character;
    const player2Character = this.game.clientGameState.player2?.character;
    
    // Update position immediately
    currentPlayer.position = {
      row: newPos.newRow,
      col: newPos.newCol
    };
    
    // Restore character state
    if (this.game.clientGameState.player1) {
      this.game.clientGameState.player1.character = player1Character;
    }
    if (this.game.clientGameState.player2) {
      this.game.clientGameState.player2.character = player2Character;
    }
    
    this.game.preferredColumn = newPos.preferredColumn;
    
    // Fast visual update
    this.game.displayManager.updateClientGameMap();
    this.game.displayManager.throttledDisplayUpdate();
    
    // Track for reconciliation
    this.movementProcessor.stateReconciler.addPendingMove({
      id: moveId,
      direction: direction,
      count: count,
      hasExplicitCount: hasExplicitCount,
      timestamp: Date.now()
    });
    
    // Send to server with optimized timeout
    this.movementProcessor.serverCommunicator.sendMoveToServer(direction, count, hasExplicitCount, moveId);
  }

  applyMoveToClientState(direction, count, hasExplicitCount) {
    const isPlayer1 = this.game.playerId === this.game.clientGameState.player1.id;
    const currentPlayer = isPlayer1 ? this.game.clientGameState.player1 : this.game.clientGameState.player2;
    const currentPos = currentPlayer.position;

    const prediction = predictMovement(
      direction,
      currentPos.row,
      currentPos.col,
      this.game.clientGameState.game_map,
      this.game.clientGameState.text_grid,
      this.game.preferredColumn,
      count,
      hasExplicitCount
    );

    if (prediction.success && prediction.finalPosition) {
      const newPos = prediction.finalPosition;
      currentPlayer.position = {
        row: newPos.newRow,
        col: newPos.newCol
      };
      
      this.game.preferredColumn = newPos.preferredColumn;
      
      const pearlPos = this.game.clientGameState.pearl_position;
      if (newPos.newRow === pearlPos.row && newPos.newCol === pearlPos.col) {
        currentPlayer.score += 50;
        this.generateNewPearl();
        // Note: Pearl collection sound is played when server confirms in messageHandler
      }
      
      this.game.displayManager.updateClientGameMap();
    }
  }

  generateNewPearl() {
    const textGrid = this.game.clientGameState.text_grid;
    const gameMap = this.game.clientGameState.game_map;
    
    if (!textGrid || textGrid.length === 0) {
      logger.warn('Cannot generate pearl - no text grid available');
      return;
    }
    
    let newRow, newCol;
    let attempts = 0;
    
    do {
      newRow = Math.floor(Math.random() * textGrid.length);
      newCol = Math.floor(Math.random() * textGrid[newRow].length);
      attempts++;
    } while (gameMap[newRow] && gameMap[newRow][newCol] !== 0 && attempts < 100);
    
    this.game.clientGameState.pearl_position = { row: newRow, col: newCol };
  }
}