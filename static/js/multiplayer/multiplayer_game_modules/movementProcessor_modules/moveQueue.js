export class MoveQueue {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
    this.moveQueue = [];
    this.isProcessingMove = false;
    this.batchQueue = [];
    this.batchTimeout = null;
    this.BATCH_DELAY = 50; // 50ms batch window
    this.MAX_BATCH_SIZE = 10;
  }

  queueMove(direction, count = 1, hasExplicitCount = false) {
    // More optimistic - always try client prediction first
    // Only block if absolutely necessary
    if (this.game.countdownActive) {
      this.showMoveBlocked(direction);
      return;
    }
    
    // Immediate client prediction with optimistic handling
    this.movementProcessor.clientPredictor.processMoveWithPrediction(direction, count, hasExplicitCount);
  }
  

  showMoveBlocked(direction) {
    logger.debug('Move blocked:', direction);
  }
}