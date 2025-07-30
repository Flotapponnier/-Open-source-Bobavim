export class ConnectionManager {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.game = websocketManager.game;
    this.websocket = null;
  }

  setupWebSocket() {
    if (!this.game.gameId || !this.game.playerId) {
      logger.error('Cannot setup WebSocket without gameId and playerId');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/multiplayer/${this.game.gameId}`;
    
    logger.debug('Connecting to WebSocket:', wsUrl);
    
    this.websocket = new WebSocket(wsUrl);
    this.game.websocket = this.websocket;
    this.websocketManager.websocket = this.websocket;
    
    this.websocket.onopen = () => {
      logger.debug('🔗 WebSocket connected');
      this.websocketManager.reconnectionManager.resetReconnectAttempts();
      this.game.updateConnectionStatus('connected', 'Connected (Live)');
      
      // Request countdown status from server when we connect
      const countdownRequest = {
        type: 'request_countdown_status',
        player_id: this.game.playerId,
        game_id: this.game.gameId
      };
      
      logger.debug('🎯 Requesting countdown status:', countdownRequest);
      this.websocket.send(JSON.stringify(countdownRequest));
      logger.debug('✅ Countdown request sent');
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.websocketManager.messageHandler.handleWebSocketMessage(message);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = (event) => {
      logger.debug('WebSocket disconnected:', event.code, event.reason);
      this.websocket = null;
      this.game.websocket = null;
      this.websocketManager.websocket = null;
      this.game.updateConnectionStatus('disconnected', 'Disconnected');
      
      if (event.code !== 1000) {
        this.websocketManager.reconnectionManager.attemptReconnection();
      }
    };
    
    this.websocket.onerror = (error) => {
      logger.error('WebSocket error:', error);
      this.game.updateConnectionStatus('disconnected', 'Connection Error');
    };
  }

  async disconnect() {
    if (this.websocket) {
      this.websocket.close(1000, 'User disconnected');
      this.websocket = null;
      this.game.websocket = null;
      this.websocketManager.websocket = null;
    }
    
    if (this.game.playerId) {
      try {
        await fetch('/api/multiplayer/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        logger.warn('Error disconnecting:', error);
      }
    }
  }
}