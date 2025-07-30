export class GameStateManager {
  constructor(game) {
    this.game = game;
  }

  cloneGameState(gameState) {
    logger.debug('Cloning game state:', gameState);
    
    if (!gameState.text_grid || !gameState.game_map) {
      logger.error('Invalid game state - missing text_grid or game_map:', gameState);
      return null;
    }
    
    const cloned = {
      text_grid: gameState.text_grid.map(row => [...row]),
      game_map: gameState.game_map.map(row => [...row]),
      player1: { ...gameState.player1 },
      player2: { ...gameState.player2 },
      pearl_position: { ...gameState.pearl_position },
      current_player: gameState.current_player,
      is_completed: gameState.is_completed,
      winner: gameState.winner,
      map: gameState.map
    };
    
    logger.debug('🎭 CHARACTER DEBUG - Original characters:', {
      player1Character: gameState.player1?.character,
      player2Character: gameState.player2?.character
    });
    logger.debug('🎭 CHARACTER DEBUG - Cloned characters:', {
      player1Character: cloned.player1?.character,
      player2Character: cloned.player2?.character
    });
    
    logger.debug('Cloned game state:', cloned);
    return cloned;
  }

  initializeClientGameState() {
    if (typeof window.gameState === 'undefined') {
      window.gameState = {
        isActive: false,
        currentRow: 0,
        currentCol: 0,
        preferredColumn: 0,
        gameMap: [],
        textGrid: [],
        score: 0
      };
    }
    
    window.updateClientGameState = (newState) => {
      if (this.game.clientGameState) {
        window.gameState.currentRow = this.game.getCurrentPlayerPosition().row;
        window.gameState.currentCol = this.game.getCurrentPlayerPosition().col;
        window.gameState.preferredColumn = this.game.preferredColumn;
        window.gameState.gameMap = this.game.clientGameState.game_map;
        window.gameState.textGrid = this.game.clientGameState.text_grid;
        window.gameState.score = this.game.getCurrentPlayerScore();
      }
    };
  }

  updateClientGameStateForPrediction() {
    if (!this.game.clientGameState || !window.gameState) return;
    
    const currentPos = this.game.getCurrentPlayerPosition();
    window.gameState.currentRow = currentPos.row;
    window.gameState.currentCol = currentPos.col;
    window.gameState.preferredColumn = this.game.preferredColumn;
    window.gameState.gameMap = this.game.clientGameState.game_map;
    window.gameState.textGrid = this.game.clientGameState.text_grid;
    window.gameState.score = this.game.getCurrentPlayerScore();
    
    if (typeof window.updateClientGameState === 'function') {
      window.updateClientGameState();
    }
  }

  async loadGameState() {
    try {
      logger.debug('Loading game state for match ID:', this.game.matchId);
      this.game.updateConnectionStatus('connecting', 'Loading game...');
      
      const response = await fetch(`/api/multiplayer/game?match_id=${this.game.matchId}`);
      logger.debug('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      logger.debug('Game data received:', data);
      logger.debug('🎭 CHARACTER DEBUG - Received character data:', {
        player1Character: data.player1?.character,
        player2Character: data.player2?.character,
        player1ID: data.player1?.id,
        player2ID: data.player2?.id,
        currentPlayerID: data.current_player
      });
      
      if (data.success) {
        this.game.gameId = data.game_id;
        this.game.playerId = data.current_player;
        this.game.gameState = data;
        this.game.clientGameState = this.cloneGameState(data);
        
        if (!this.game.clientGameState) {
          throw new Error('Failed to clone game state - invalid data structure');
        }
        
        logger.debug('Game state loaded successfully:', {
          gameId: this.game.gameId,
          playerId: this.game.playerId,
          textGrid: this.game.clientGameState.text_grid?.length,
          gameMap: this.game.clientGameState.game_map?.length
        });
        
        this.game.updateConnectionStatus('connected', 'Connected');
        this.game.displayManager.hideLoading();
        this.game.displayManager.showGameContent();
        this.game.displayManager.updateGameDisplay();
        
        this.game.lastRenderedPositions = { player1: null, player2: null, pearl: null };
        setTimeout(() => {
          logger.debug('🎬 FORCING INITIAL RENDER');
          this.game.displayManager.updateGameMapOptimized();
        }, 100);
        
        this.updateClientGameStateForPrediction();
        
        setTimeout(() => {
          if (typeof window.responsiveScaling !== 'undefined' && typeof window.responsiveScaling.initializeResponsiveScaling === 'function') {
            logger.debug('Initializing responsive scaling for multiplayer...');
            window.responsiveScaling.initializeResponsiveScaling();
          } else if (typeof initializeResponsiveScaling === 'function') {
            logger.debug('Initializing responsive scaling (global function)...');
            initializeResponsiveScaling();
          } else {
            logger.warn('Responsive scaling not available');
          }
        }, 300);
        
        this.game.websocketManager.setupWebSocket();
        
      } else {
        throw new Error(data.error || 'Failed to load game');
      }
    } catch (error) {
      logger.error('Error loading game state:', error);
      this.game.displayManager.showError('Failed to load game: ' + error.message);
    }
  }
}