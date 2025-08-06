export class MoveQueue {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
    this.isProcessingMove = false;
    this.lastMoveTime = 0;
    this.MOVE_COOLDOWN = 80; // Slightly longer cooldown to prevent rapid-fire
  }

  queueMove(direction, count = 1, hasExplicitCount = false) {
    // Check for countdown or if already processing
    if (this.game.countdownActive || this.isProcessingMove) {
      this.showMoveBlocked(direction);
      return;
    }
    
    // Add cooldown to prevent rapid-fire movements
    const now = Date.now();
    if (now - this.lastMoveTime < this.MOVE_COOLDOWN) {
      logger.debug('Move blocked by cooldown:', direction);
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