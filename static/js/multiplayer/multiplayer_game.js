import { GameStateManager } from "./multiplayer_game_modules/gameStateManager.js";
import { KeyboardHandler } from "./multiplayer_game_modules/keyboardHandler.js";
import { MovementProcessor } from "./multiplayer_game_modules/movementProcessor.js";
import { DisplayManager } from "./multiplayer_game_modules/displayManager.js";
import { WebSocketManager } from "./multiplayer_game_modules/websocketManager.js";
import { GameCompletionHandler } from "./multiplayer_game_modules/gameCompletionHandler.js";
import { ModuleInitializer } from "./multiplayer_game_modules/moduleInitializer.js";
import { initializeGameSoundEffects } from "../game_js_modules/gameSoundEffects.js";

class MultiplayerGame {
  constructor() {
    this.matchId = window.MULTIPLAYER_MATCH_ID;
    this.isMultiplayer = window.IS_MULTIPLAYER;
    this.gameId = null;
    this.playerId = null;
    this.gameState = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.websocket = null;
    
    this.clientGameState = null;
    this.preferredColumn = 0;
    
    this.lastRenderedPositions = {
      player1: null,
      player2: null,
      pearl: null
    };
    
    this.lastForceUpdate = 0;
    
    // Initialize countdown state (assume active until told otherwise)
    this.countdownActive = true;
    
    // Initialize sound effects
    initializeGameSoundEffects();
    
    this.gameStateManager = new GameStateManager(this);
    this.keyboardHandler = new KeyboardHandler(this);
    this.movementProcessor = new MovementProcessor(this);
    this.displayManager = new DisplayManager(this);
    this.websocketManager = new WebSocketManager(this);
    this.gameCompletionHandler = new GameCompletionHandler(this);
    this.moduleInitializer = new ModuleInitializer(this);
    
    this.moduleInitializer.initializeGameModules();
    this.init();
  }

  init() {
    logger.debug("Initializing multiplayer game...", { matchId: this.matchId });
    
    this.moduleInitializer.disableSoloGameHandlers();
    
    this.setupEventListeners();
    this.keyboardHandler.setupKeyboardControls();
    this.showDebugInfo();
    this.gameStateManager.loadGameState();
  }

  setupEventListeners() {
    document.getElementById('quit-multiplayer-btn')?.addEventListener('click', () => {
      this.quitGame();
    });

    document.getElementById('retry-connection-btn')?.addEventListener('click', () => {
      this.retryConnection();
    });

    document.getElementById('toggle-debug-btn')?.addEventListener('click', () => {
      this.toggleDebug();
    });

    window.addEventListener('beforeunload', () => {
      this.websocketManager.disconnect();
    });
  }
  
  toggleDebug() {
    const debugElement = document.getElementById('multiplayer-debug-info');
    if (debugElement) {
      const isVisible = debugElement.style.display !== 'none';
      debugElement.style.display = isVisible ? 'none' : 'block';
      
      const toggleButton = document.getElementById('toggle-debug-btn');
      if (toggleButton) {
        toggleButton.textContent = isVisible ? 'Show Debug' : 'Hide Debug';
      }
    }
  }
  
  showDebugInfo() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const debugElement = document.getElementById('multiplayer-debug-info');
      if (debugElement) {
        debugElement.style.display = 'block';
      }
    }
  }

  getCurrentPlayerPosition() {
    if (!this.clientGameState) return { row: 0, col: 0 };
    
    const isPlayer1 = this.playerId === this.clientGameState.player1?.id;
    const currentPlayer = isPlayer1 ? this.clientGameState.player1 : this.clientGameState.player2;
    return currentPlayer?.position || { row: 0, col: 0 };
  }
  
  getCurrentPlayerScore() {
    if (!this.clientGameState) return 0;
    
    const isPlayer1 = this.playerId === this.clientGameState.player1?.id;
    const currentPlayer = isPlayer1 ? this.clientGameState.player1 : this.clientGameState.player2;
    return currentPlayer?.score || 0;
  }

  updateConnectionStatus(status, text) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (statusDot) {
      statusDot.className = `status-dot ${status}`;
    }
    if (statusText) {
      statusText.textContent = text;
    }
    
    this.isConnected = status === 'connected';
  }

  retryConnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.gameStateManager.loadGameState();
    } else {
      this.displayManager.showError('Max reconnection attempts reached. Please refresh the page.');
    }
  }

  async quitGame() {
    if (confirm('Are you sure you want to quit the game?')) {
      await this.websocketManager.disconnect();
      window.location.href = '/';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  logger.debug('DOM loaded, checking multiplayer initialization:', {
    isMultiplayer: window.IS_MULTIPLAYER,
    matchId: window.MULTIPLAYER_MATCH_ID
  });
  
  if (window.IS_MULTIPLAYER && window.MULTIPLAYER_MATCH_ID) {
    logger.debug('Initializing multiplayer game...');
    new MultiplayerGame();
  } else {
    logger.error('Multiplayer initialization failed - missing variables:', {
      isMultiplayer: window.IS_MULTIPLAYER,
      matchId: window.MULTIPLAYER_MATCH_ID
    });
  }
});