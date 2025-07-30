export class ServerCommunicator {
  constructor(movementProcessor) {
    this.movementProcessor = movementProcessor;
    this.game = movementProcessor.game;
  }

  async sendMoveToServer(direction, count, hasExplicitCount, moveId) {
    try {
      logger.debug('📡 SENDING MOVE TO SERVER:', {
        gameId: this.game.gameId,
        direction,
        count,
        hasExplicitCount,
        moveId,
        actualPayload: {
          direction: direction,
          count: count,
          has_explicit_count: hasExplicitCount,
          move_id: moveId
        }
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`/api/multiplayer/game/${this.game.gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          direction: direction,
          count: count,
          has_explicit_count: hasExplicitCount,
          move_id: moveId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      logger.debug('Server response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.debug('Server response data:', data);
      
      if (data.success) {
        this.movementProcessor.stateReconciler.reconcileServerStateOptimized(data, moveId);
        
        if (data.completed) {
          this.game.gameCompletionHandler.handleGameCompletion(data);
        }
      } else {
        logger.warn('Server rejected move:', data.error);
        this.movementProcessor.stateReconciler.rollbackMove(moveId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Move request timed out:', moveId);
      } else {
        logger.error('Error sending move to server:', error);
      }
      this.movementProcessor.stateReconciler.rollbackMove(moveId);
    }
  }
}