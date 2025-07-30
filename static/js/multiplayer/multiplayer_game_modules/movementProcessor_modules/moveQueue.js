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
    logger.debug('🔄 QUEUEING MOVE:', direction, 'count:', count, 'hasExplicitCount:', hasExplicitCount, 'countdownActive:', this.game.countdownActive);
    
    // Block all movement during countdown
    if (this.game.countdownActive) {
      logger.debug('🚫 Move blocked - countdown active');
      this.showMoveBlocked(direction);
      return;
    }
    
    // Process with client prediction AND send to server immediately
    // This restores the proper prediction->validation flow
    this.movementProcessor.clientPredictor.processMoveWithPrediction(direction, count, hasExplicitCount);
  }
  
  compressMove(direction, count, hasExplicitCount) {
    // Check if we can compress with the last move in batch
    if (this.batchQueue.length > 0) {
      const lastMove = this.batchQueue[this.batchQueue.length - 1];
      if (lastMove.direction === direction && !hasExplicitCount && !lastMove.hasExplicitCount) {
        // Combine identical moves
        lastMove.count += count;
        logger.debug('🗜️ COMPRESSED MOVE:', direction, 'new count:', lastMove.count);
        return null; // Signal that move was compressed
      }
    }
    return { direction, count, hasExplicitCount };
  }
  
  scheduleBatchProcessing() {
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Process immediately if batch is full
    if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
      this.processBatch();
      return;
    }
    
    // Schedule batch processing
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }
  
  async processBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.filter(move => move !== null);
    this.batchQueue = [];
    this.batchTimeout = null;
    
    logger.debug('📦 PROCESSING BATCH:', batch.length, 'moves');
    
    // Send all moves to server for validation (non-blocking)
    // Client prediction has already been applied visually
    batch.forEach(move => {
      const moveId = `batch_${Date.now()}_${Math.random()}`;
      this.movementProcessor.serverCommunicator.sendMoveToServer(
        move.direction, 
        move.count, 
        move.hasExplicitCount, 
        moveId
      );
    });
  }

  showMoveBlocked(direction) {
    logger.debug('Move blocked:', direction);
  }
}