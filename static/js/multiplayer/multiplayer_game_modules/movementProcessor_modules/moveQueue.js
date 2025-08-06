import { networkAdapter } from '../../../shared/networkAdapter.js';

export class MoveQueue {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
    this.isProcessingMove = false;
    this.lastMoveTime = 0;
  }

  queueMove(direction, count = 1, hasExplicitCount = false) {
    // Check for countdown or if already processing
    if (this.game.countdownActive || this.isProcessingMove) {
      this.showMoveBlocked(direction);
      return;
    }
    
    // Track movement and get adaptive cooldown
    networkAdapter.trackMovement(direction);
    const now = Date.now();
    const cooldown = networkAdapter.getMoveCooldown(true, direction); // Pass direction for spam detection
    if (now - this.lastMoveTime < cooldown) {
      logger.debug('Move blocked by adaptive cooldown:', direction, cooldown + 'ms');
      return;
    }
    
    this.isProcessingMove = true;
    this.lastMoveTime = now;
    
    // Process single move immediately (no batching)
    this.movementProcessor.clientPredictor.processMoveWithPrediction(direction, count, hasExplicitCount)
      .finally(() => {
        // Reset processing flag after a short delay to allow server response
        setTimeout(() => {
          this.isProcessingMove = false;
        }, 50);
      });
  }
  

  showMoveBlocked(direction) {
    logger.debug('Move blocked:', direction);
  }
}