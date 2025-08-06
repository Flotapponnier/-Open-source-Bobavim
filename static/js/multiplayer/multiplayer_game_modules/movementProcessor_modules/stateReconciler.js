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
    
    // Always sync client state to server state to prevent drift
    this.game.clientGameState = this.game.gameStateManager.cloneGameState(serverState);
    
    // Only update display if no pending moves to avoid conflicts
    if (this.pendingMoves.length === 0) {
      this.game.displayManager.updateGameDisplayOptimized();
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