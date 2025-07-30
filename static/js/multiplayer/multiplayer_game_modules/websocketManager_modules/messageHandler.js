import { gameSoundEffectsManager } from "../../../game_js_modules/gameSoundEffects.js";

export class MessageHandler {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.game = websocketManager.game;
  }

  handleWebSocketMessage(message) {
    logger.debug('🔥 WEBSOCKET MESSAGE RECEIVED:', message.type, message);
    
    switch (message.type) {
      case 'game_update':
        logger.debug('🎮 Processing game update...');
        this.handleGameUpdate(message.data);
        break;
      case 'game_complete':
        logger.debug('🏆 Game completed');
        this.game.gameCompletionHandler.handleGameCompletion(message.data);
        break;
      case 'player_disconnected':
        logger.debug('👋 Player disconnected');
        this.handlePlayerDisconnected(message.data);
        break;
      case 'game_expired':
        logger.debug('⏰ Game expired');
        this.handleGameExpired(message.data);
        break;
      case 'countdown':
        logger.debug('⏰ Countdown message received:', message.data);
        this.handleCountdown(message.data);
        break;
      default:
        logger.warn('❓ Unknown WebSocket message type:', message.type);
    }
  }

  handleGameUpdate(data) {
    logger.debug('🔄 HANDLING GAME UPDATE:', data);
    logger.debug('🎯 Current player ID:', this.game.playerId);
    logger.debug('📊 Pending moves:', this.game.movementProcessor.pendingMoves.length);
    logger.debug('🎭 CHARACTER DEBUG - Current character data in handleGameUpdate:', {
      player1Character: this.game.gameState?.player1?.character,
      player2Character: this.game.gameState?.player2?.character,
      player1ID: this.game.gameState?.player1?.id,
      player2ID: this.game.gameState?.player2?.id
    });
    logger.debug('🎭 CHARACTER DEBUG - Client character data in handleGameUpdate:', {
      player1Character: this.game.clientGameState?.player1?.character,
      player2Character: this.game.clientGameState?.player2?.character,
      player1ID: this.game.clientGameState?.player1?.id,
      player2ID: this.game.clientGameState?.player2?.id
    });
    
    if (!this.game.gameState) {
      logger.error('❌ No game state available');
      return;
    }
    
    const p1PosChanged = !this.positionsEqual(this.game.gameState.player1.position, data.player1_position);
    const p2PosChanged = !this.positionsEqual(this.game.gameState.player2.position, data.player2_position);
    const pearlPosChanged = !this.positionsEqual(this.game.gameState.pearl_position, data.pearl_position);
    
    logger.debug('🔍 DETAILED Position comparison:');
    logger.debug('P1 OLD:', JSON.stringify(this.game.gameState.player1.position), 'NEW:', JSON.stringify(data.player1_position), 'CHANGED:', p1PosChanged);
    logger.debug('P2 OLD:', JSON.stringify(this.game.gameState.player2.position), 'NEW:', JSON.stringify(data.player2_position), 'CHANGED:', p2PosChanged);
    logger.debug('Pearl OLD:', JSON.stringify(this.game.gameState.pearl_position), 'NEW:', JSON.stringify(data.pearl_position), 'CHANGED:', pearlPosChanged);
    
    if (!p1PosChanged && !p2PosChanged && !pearlPosChanged && 
        this.game.gameState.player1.score === data.player1_score && 
        this.game.gameState.player2.score === data.player2_score) {
      logger.debug('⏭️ No changes detected, but checking for force update conditions');
      
      const now = Date.now();
      if (!this.game.lastForceUpdate || now - this.game.lastForceUpdate > 10000) {
        logger.debug('🔥 FORCING UPDATE due to timeout - ensuring opponent visibility');
        this.game.lastForceUpdate = now;
      } else {
        logger.debug('⏭️ Skipping update');
        return;
      }
    }
    
    this.updateGameStateFromServer(data);
    this.updateClientStateBasedOnPendingMoves(data);
    this.forceVisualUpdate();
  }

  updateGameStateFromServer(data) {
    // Store old scores for comparison
    const oldP1Score = this.game.gameState.player1.score;
    const oldP2Score = this.game.gameState.player2.score;
    
    this.game.gameState.player1.position = data.player1_position;
    this.game.gameState.player1.score = data.player1_score;
    const player1Character = this.game.gameState.player1.character;
    
    this.game.gameState.player2.position = data.player2_position;
    this.game.gameState.player2.score = data.player2_score;
    const player2Character = this.game.gameState.player2.character;
    
    this.game.gameState.pearl_position = data.pearl_position;
    
    this.game.gameState.player1.character = player1Character;
    this.game.gameState.player2.character = player2Character;
    
    // Check for score changes (pearl collection)
    const isPlayer1 = this.game.playerId === this.game.gameState.player1.id;
    if (isPlayer1 && data.player1_score > oldP1Score) {
      // Current player (P1) scored
      gameSoundEffectsManager.playPearlCollectedSound();
    } else if (!isPlayer1 && data.player2_score > oldP2Score) {
      // Current player (P2) scored
      gameSoundEffectsManager.playPearlCollectedSound();
    }
    
    logger.debug('🏆 Updated server state - P1:', data.player1_position, 'P2:', data.player2_position);
  }

  updateClientStateBasedOnPendingMoves(data) {
    const isPlayer1 = this.game.playerId === this.game.gameState.player1.id;
    logger.debug('🎲 Player identification:', {
      currentPlayerID: this.game.playerId,
      player1ID: this.game.gameState.player1.id,
      player2ID: this.game.gameState.player2.id,
      isPlayer1: isPlayer1
    });
    
    if (this.game.movementProcessor.pendingMoves.length === 0) {
      logger.debug('✅ No pending moves - updating everything');
      this.game.clientGameState = this.game.gameStateManager.cloneGameState(this.game.gameState);
      
      logger.debug('🔧 FIXING COLOR CODING after server update');
      this.game.displayManager.updateClientGameMap();
      
      this.game.displayManager.updateGameDisplay();
    } else {
      logger.debug('⏳ Has pending moves - selective update');
      
      // Store old scores for comparison
      const oldP1Score = this.game.clientGameState.player1.score;
      const oldP2Score = this.game.clientGameState.player2.score;
      
      if (isPlayer1) {
        logger.debug('🎯 Updating opponent (P2) position from', JSON.stringify(this.game.clientGameState.player2.position), 'to', JSON.stringify(data.player2_position));
        const p2Character = this.game.clientGameState.player2.character;
        this.game.clientGameState.player2.position = data.player2_position;
        this.game.clientGameState.player2.score = data.player2_score;
        this.game.clientGameState.player2.character = p2Character;
        this.game.clientGameState.player1.score = data.player1_score;
        
        // Check for score change (pearl collection by current player)
        if (data.player1_score > oldP1Score) {
          gameSoundEffectsManager.playPearlCollectedSound();
        }
        
        logger.debug('✅ P2 position updated with character preserved:', p2Character);
      } else {
        logger.debug('🎯 Updating opponent (P1) position from', JSON.stringify(this.game.clientGameState.player1.position), 'to', JSON.stringify(data.player1_position));
        const p1Character = this.game.clientGameState.player1.character;
        this.game.clientGameState.player1.position = data.player1_position;
        this.game.clientGameState.player1.score = data.player1_score;
        this.game.clientGameState.player2.score = data.player2_score;
        
        // Check for score change (pearl collection by current player)
        if (data.player2_score > oldP2Score) {
          gameSoundEffectsManager.playPearlCollectedSound();
        }
        this.game.clientGameState.player1.character = p1Character;
        logger.debug('✅ P1 position updated with character preserved:', p1Character);
        this.game.clientGameState.player2.score = data.player2_score;
      }
      
      this.game.clientGameState.pearl_position = data.pearl_position;
      logger.debug('💎 Updated pearl position:', data.pearl_position);
      
      this.game.displayManager.uiUpdater.updateScoresAndDebug();
      logger.debug('📊 Updated scores and debug info');
      
      logger.debug('🔧 APPLYING COLOR CODING before forced visual update');
      this.game.displayManager.updateClientGameMap();
      
      logger.debug('🎯 FORCING VISUAL UPDATE FOR OPPONENT MOVEMENT');
      
      requestAnimationFrame(() => {
        logger.debug('🚀 FORCING OPTIMIZED UPDATE FOR OPPONENT MOVEMENT');
        this.game.displayManager.updateClientGameMap();
        this.game.displayManager.updateGameMapOptimized();
        logger.debug('✅ Optimized update completed via requestAnimationFrame');
      });
    }
  }

  forceVisualUpdate() {
    logger.debug('🔄 FORCING DOM REFLOW AND REPAINT');
    const mapElement = document.getElementById('multiplayer-game-map');
    if (mapElement) {
      const height = mapElement.offsetHeight;
      const width = mapElement.offsetWidth;
      logger.debug('📏 Map dimensions (forcing reflow):', width, 'x', height);
      
      mapElement.style.transform = 'translateZ(0)';
      mapElement.offsetHeight;
      mapElement.style.transform = '';
      
      const sprites = mapElement.querySelectorAll('.boba-character, .pearl');
      sprites.forEach(sprite => {
        sprite.style.visibility = 'visible';
        sprite.style.opacity = '1';
      });
      
      logger.debug('🎨 Found and ensured visibility of', sprites.length, 'sprites');
    }
    
    logger.debug('🎭 CHARACTER DEBUG - Final character data after handleGameUpdate:', {
      gameStateP1Character: this.game.gameState?.player1?.character,
      gameStateP2Character: this.game.gameState?.player2?.character,
      clientStateP1Character: this.game.clientGameState?.player1?.character,
      clientStateP2Character: this.game.clientGameState?.player2?.character
    });
  }

  positionsEqual(pos1, pos2) {
    if (!pos1 || !pos2) {
      logger.debug('🔍 positionsEqual: one position is null/undefined', JSON.stringify(pos1), JSON.stringify(pos2));
      return false;
    }
    const equal = pos1.row === pos2.row && pos1.col === pos2.col;
    if (!equal) {
      logger.debug('🔍 positionsEqual: positions differ', JSON.stringify(pos1), 'vs', JSON.stringify(pos2));
    }
    return equal;
  }

  handlePlayerDisconnected(data) {
    logger.debug('👋 PLAYER DISCONNECTED:', data);
    
    this.game.isConnected = false;
    if (this.websocketManager.websocket) {
      this.websocketManager.websocket.close();
      this.websocketManager.websocket = null;
      this.game.websocket = null;
    }
    
    // Use the new unified completion handler
    this.game.gameCompletionHandler.handlePlayerDisconnection({
      reason: 'Your opponent has left the game',
      message: 'You win by default!',
      ...data
    });
  }

  handleGameExpired(data) {
    logger.debug('⏰ GAME EXPIRED:', data);
    
    this.game.isConnected = false;
    if (this.websocketManager.websocket) {
      this.websocketManager.websocket.close();
      this.websocketManager.websocket = null;
      this.game.websocket = null;
    }
    
    // Use the new unified completion handler
    this.game.gameCompletionHandler.handleGameTimeout({
      reason: 'Game timed out (8 minutes)',
      message: 'Time limit exceeded',
      ...data
    });
  }

  handleCountdown(data) {
    logger.debug('⏰ COUNTDOWN:', data);
    
    // Track countdown state in game
    this.game.countdownActive = data.active;
    
    if (data.active) {
      // Show countdown number
      this.showCountdownDisplay(data.value);
    } else {
      // Countdown finished, show "GO" and then hide
      this.showCountdownDisplay(data.value);
      setTimeout(() => {
        this.hideCountdownDisplay();
        // Allow movement after countdown finishes
        this.game.countdownActive = false;
      }, 1000);
    }
  }

  showCountdownDisplay(value) {
    logger.debug('🎯 showCountdownDisplay called with:', value);
    let countdownElement = document.getElementById('multiplayer-countdown');
    
    // Create countdown element if it doesn't exist
    if (!countdownElement) {
      logger.debug('📍 Creating new countdown element');
      countdownElement = document.createElement('div');
      countdownElement.id = 'multiplayer-countdown';
      countdownElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        font-weight: bold;
        text-align: center;
        color: #27ae60;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px 40px;
        border-radius: 15px;
        animation: countdownPulse 1s ease-in-out;
      `;
      
      // Try multiple possible containers
      let gameMapContainer = document.getElementById('multiplayer-game-map');
      if (!gameMapContainer) {
        gameMapContainer = document.getElementById('game-map');
      }
      if (!gameMapContainer) {
        gameMapContainer = document.querySelector('.multiplayer-game-board');
      }
      if (!gameMapContainer) {
        gameMapContainer = document.querySelector('.game-board');
      }
      if (!gameMapContainer) {
        gameMapContainer = document.body;
      }
      
      logger.debug('📍 Adding countdown to container:', gameMapContainer);
      gameMapContainer.appendChild(countdownElement);
    }
    
    // Update countdown value
    countdownElement.textContent = value;
    
    // Add animation
    countdownElement.style.animation = 'none';
    countdownElement.offsetHeight; // Trigger reflow
    countdownElement.style.animation = 'countdownPulse 1s ease-in-out';
    
    // Change color for "GO"
    if (value === 'GO') {
      countdownElement.style.color = '#f39c12';
    } else {
      countdownElement.style.color = '#27ae60';
    }
  }

  hideCountdownDisplay() {
    const countdownElement = document.getElementById('multiplayer-countdown');
    if (countdownElement) {
      countdownElement.remove();
    }
  }
}