import { gameSoundEffectsManager } from "../../../game_js_modules/gameSoundEffects.js";

export class StateReconciler {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
    this.pendingMoves = [];
  }

  addPendingMove(move) {
    this.pendingMoves.push(move);
  }

  reconcileServerStateOptimized(serverState, moveId) {
    this.pendingMoves = this.pendingMoves.filter(move => move.id !== moveId);
    
    // Check for significant state differences
    const hasSignificantDifference = this.hasSignificantStateDifference(serverState);
    
    // Store old scores for sound effects
    const oldP1Score = this.game.gameState?.player1?.score || 0;
    const oldP2Score = this.game.gameState?.player2?.score || 0;
    
    this.game.gameState = serverState;
    
    // Play sound effects for score changes
    const isPlayer1 = this.game.playerId === serverState.player1.id;
    if (isPlayer1 && serverState.player1.score > oldP1Score) {
      gameSoundEffectsManager.playPearlCollectedSound();
    } else if (!isPlayer1 && serverState.player2.score > oldP2Score) {
      gameSoundEffectsManager.playPearlCollectedSound();
    }
    
    // More conservative reconciliation - only update if necessary
    if (this.pendingMoves.length === 0 || hasSignificantDifference) {
      this.game.clientGameState = this.game.gameStateManager.cloneGameState(serverState);
      this.game.displayManager.updateGameDisplayOptimized();
    } else {
      // Selective update - only non-position data
      this.updateNonPositionData(serverState);
    }
  }

  hasSignificantStateDifference(serverState) {
    if (!this.game.clientGameState) return true;
    
    // Check if pearl position changed
    const clientPearl = this.game.clientGameState.pearl_position;
    const serverPearl = serverState.pearl_position;
    if (!clientPearl || clientPearl.row !== serverPearl.row || clientPearl.col !== serverPearl.col) {
      return true;
    }
    
    // Check for score differences
    if (this.game.clientGameState.player1.score !== serverState.player1.score ||
        this.game.clientGameState.player2.score !== serverState.player2.score) {
      return true;
    }
    
    return false;
  }

  updateNonPositionData(serverState) {
    // Update scores and pearl position without touching player positions
    this.game.clientGameState.player1.score = serverState.player1.score;
    this.game.clientGameState.player2.score = serverState.player2.score;
    this.game.clientGameState.pearl_position = serverState.pearl_position;
    
    // Update UI elements
    const p1Score = document.getElementById('player1-score');
    const p2Score = document.getElementById('player2-score');
    if (p1Score) p1Score.textContent = serverState.player1.score;
    if (p2Score) p2Score.textContent = serverState.player2.score;
  }

  rollbackMove(moveId) {
    this.pendingMoves = this.pendingMoves.filter(move => move.id !== moveId);
    this.game.clientGameState = this.game.gameStateManager.cloneGameState(this.game.gameState);
    this.reapplyPendingMoves();
    this.game.displayManager.updateGameDisplayOptimized();
  }

  reapplyPendingMoves() {
    for (const move of this.pendingMoves) {
      this.movementProcessor.clientPredictor.applyMoveToClientState(move.direction, move.count, move.hasExplicitCount);
    }
  }
}