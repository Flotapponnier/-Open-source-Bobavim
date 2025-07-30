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
    
    // Store old scores for comparison
    const oldP1Score = this.game.gameState.player1.score;
    const oldP2Score = this.game.gameState.player2.score;
    
    this.game.gameState = serverState;
    
    // Check for score changes (pearl collection)
    const isPlayer1 = this.game.playerId === this.game.gameState.player1.id;
    if (isPlayer1 && serverState.player1.score > oldP1Score) {
      // Current player (P1) scored
      gameSoundEffectsManager.playPearlCollectedSound();
    } else if (!isPlayer1 && serverState.player2.score > oldP2Score) {
      // Current player (P2) scored
      gameSoundEffectsManager.playPearlCollectedSound();
    }
    
    if (this.pendingMoves.length === 0) {
      this.game.clientGameState = this.game.gameStateManager.cloneGameState(serverState);
      this.game.displayManager.updateGameDisplayOptimized();
    } else {
      this.game.clientGameState.player1.score = serverState.player1.score;
      this.game.clientGameState.player2.score = serverState.player2.score;
      this.game.clientGameState.pearl_position = serverState.pearl_position;
      
      const p1Score = document.getElementById('player1-score');
      const p2Score = document.getElementById('player2-score');
      if (p1Score) p1Score.textContent = serverState.player1.score;
      if (p2Score) p2Score.textContent = serverState.player2.score;
    }
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