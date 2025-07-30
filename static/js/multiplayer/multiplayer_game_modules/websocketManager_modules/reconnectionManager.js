export class ReconnectionManager {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.game = websocketManager.game;
    this.wsReconnectAttempts = 0;
    this.maxWsReconnectAttempts = 5;
    this.wsReconnectDelay = 1000;
  }

  attemptReconnection() {
    if (this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
      this.wsReconnectAttempts++;
      logger.debug(`Attempting WebSocket reconnection ${this.wsReconnectAttempts}/${this.maxWsReconnectAttempts}`);
      setTimeout(() => this.websocketManager.connectionManager.setupWebSocket(), this.wsReconnectDelay * this.wsReconnectAttempts);
    }
  }

  resetReconnectAttempts() {
    this.wsReconnectAttempts = 0;
  }
}