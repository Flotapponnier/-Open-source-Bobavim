import { ConnectionManager } from "./websocketManager_modules/connectionManager.js";
import { MessageHandler } from "./websocketManager_modules/messageHandler.js";
import { ReconnectionManager } from "./websocketManager_modules/reconnectionManager.js";

export class WebSocketManager {
  constructor(game) {
    this.game = game;
    this.websocket = null;
    
    // Initialize submodules
    this.connectionManager = new ConnectionManager(this);
    this.messageHandler = new MessageHandler(this);
    this.reconnectionManager = new ReconnectionManager(this);
  }

  // Delegate methods to submodules
  setupWebSocket() {
    this.connectionManager.setupWebSocket();
  }

  async disconnect() {
    await this.connectionManager.disconnect();
  }
}