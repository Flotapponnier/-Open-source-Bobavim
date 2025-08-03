// Pause Menu System
// Handles game pausing, timing, backend communication, and cleanup

import { initializePauseMenuVim, disablePauseMenuVim } from './pauseMenuVimNavigation.js';

class PauseMenuSystem {
  constructor() {
    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedTime = 0;
    this.gameStartTime = null;
    this.currentMapId = null;
    this.originalKeyHandlers = new Map();
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    logger.debug("Initializing pause menu system");
    
    // Store reference globally for vim navigation callbacks
    window.pauseMenuSystem = this;
    
    // Add escape key listener for showing pause menu
    document.addEventListener('keydown', this.handleEscapeKey.bind(this), true);
    
    // Add click handlers for pause menu buttons
    this.setupPauseMenuButtons();
    
    // Store current map info
    this.storeCurrentMapInfo();
    
    this.isInitialized = true;
    logger.debug("Pause menu system initialized");
  }

  storeCurrentMapInfo() {
    // Try to get current map from various possible sources
    const mapContainer = document.querySelector('.game-board');
    if (mapContainer && mapContainer.dataset.mapId) {
      this.currentMapId = mapContainer.dataset.mapId;
    } else if (window.gameState && window.gameState.currentMap) {
      this.currentMapId = window.gameState.currentMap;
    } else if (window.currentMapId) {
      this.currentMapId = window.currentMapId;
    }
    
    logger.debug("Stored current map ID:", this.currentMapId);
  }

  handleEscapeKey(event) {
    logger.debug("Escape key pressed, event key:", event.key, "isPaused:", this.isPaused);
    
    // Only handle escape if we're in the game and not already in pause menu
    if (event.key === 'Escape' && !this.isPaused) {
      const pauseModal = document.getElementById('pauseMenuModal');
      logger.debug("Found pause modal:", !!pauseModal);
      
      const isInOtherModal = document.querySelector('.modal:not(#pauseMenuModal):not(.hidden)') || 
                           document.querySelector('.vim-manual-modal:not(.hidden)');
      logger.debug("Is in other modal:", !!isInOtherModal);
      
      // Don't show pause menu if we're in another modal
      if (isInOtherModal) {
        logger.debug("Not showing pause menu - in other modal");
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      logger.debug("About to show pause menu");
      this.showPauseMenu();
    }
  }

  setupPauseMenuButtons() {
    const resumeBtn = document.getElementById('resumeGameBtn');
    const restartBtn = document.getElementById('restartGameBtn');
    const exitBtn = document.getElementById('exitToMenuBtn');

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.resumeGame());
    }
    
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }
    
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.exitToMenu());
    }
  }

  async showPauseMenu() {
    if (this.isPaused) {
      logger.debug("Already paused, returning");
      return;
    }
    
    logger.debug("Showing pause menu");
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    
    // Pause the game
    await this.pauseGameState();
    
    // Disable game controls
    this.disableGameControls();
    
    // Show pause modal
    const pauseModal = document.getElementById('pauseMenuModal');
    logger.debug("Pause modal element:", pauseModal);
    logger.debug("Pause modal classes before:", pauseModal ? pauseModal.className : 'null');
    
    if (pauseModal) {
      pauseModal.classList.remove('hidden');
      logger.debug("Pause modal classes after:", pauseModal.className);
      logger.debug("Pause modal computed style display:", window.getComputedStyle(pauseModal).display);
      
      // Initialize vim navigation for pause menu
      setTimeout(() => {
        initializePauseMenuVim();
      }, 100); // Small delay to ensure modal is fully visible
    } else {
      logger.error("Pause modal not found in DOM!");
    }
    
    // Pause any timers or animations
    this.pauseGameTimers();
    
    logger.debug("Pause menu shown, game paused");
  }

  async pauseGameState() {
    try {
      // Send pause request to backend
      await fetch('/api/pause-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pauseTime: Date.now()
        })
      });
      
      logger.debug("Game state paused on backend");
    } catch (error) {
      logger.warn("Failed to pause game on backend:", error);
      // Continue with frontend pause even if backend fails
    }
  }

  async resumeGameState() {
    try {
      const pauseDuration = this.pauseStartTime ? Date.now() - this.pauseStartTime : 0;
      this.totalPausedTime += pauseDuration;
      
      // Send resume request to backend
      await fetch('/api/resume-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeTime: Date.now(),
          pauseDuration: pauseDuration,
          totalPausedTime: this.totalPausedTime
        })
      });
      
      logger.debug("Game state resumed on backend");
    } catch (error) {
      logger.warn("Failed to resume game on backend:", error);
      // Continue with frontend resume even if backend fails
    }
  }

  disableGameControls() {
    // Store original event handlers and disable them
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      // Disable pointer events on game board
      gameContainer.style.pointerEvents = 'none';
    }
    
    // Add overlay to prevent interaction
    const overlay = document.createElement('div');
    overlay.id = 'game-pause-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
  }

  enableGameControls() {
    // Re-enable game controls
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.style.pointerEvents = '';
    }
    
    // Remove pause overlay
    const overlay = document.getElementById('game-pause-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  pauseGameTimers() {
    // Pause any game timers, animations, or intervals
    if (window.gameTimers) {
      window.gameTimers.forEach(timer => {
        if (timer.pause) timer.pause();
      });
    }
    
    // Pause CSS animations
    document.querySelectorAll('.game-container *').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }

  resumeGameTimers() {
    // Resume game timers and animations
    if (window.gameTimers) {
      window.gameTimers.forEach(timer => {
        if (timer.resume) timer.resume();
      });
    }
    
    // Resume CSS animations
    document.querySelectorAll('.game-container *').forEach(el => {
      el.style.animationPlayState = '';
    });
  }

  hidePauseMenu() {
    const pauseModal = document.getElementById('pauseMenuModal');
    if (pauseModal) {
      pauseModal.classList.add('hidden');
    }
    
    // Disable vim navigation
    disablePauseMenuVim();
  }

  async resumeGame() {
    if (!this.isPaused) return;
    
    logger.debug("Resuming game");
    
    // Hide pause menu
    this.hidePauseMenu();
    
    // Resume game state on backend
    await this.resumeGameState();
    
    // Re-enable game controls
    this.enableGameControls();
    
    // Resume timers and animations
    this.resumeGameTimers();
    
    this.isPaused = false;
    this.pauseStartTime = null;
    
    logger.debug("Game resumed");
  }

  async restartGame() {
    logger.debug("Restarting game");
    
    // Hide pause menu first
    this.hidePauseMenu();
    
    try {
      // Call backend to restart the current map
      const response = await fetch('/api/restart-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mapId: this.currentMapId
        })
      });
      
      if (response.ok) {
        // Reload the current page to restart the game
        window.location.reload();
      } else {
        logger.error("Failed to restart game on backend");
        // Fallback: just reload the page
        window.location.reload();
      }
    } catch (error) {
      logger.error("Error restarting game:", error);
      // Fallback: just reload the page
      window.location.reload();
    }
  }

  async exitToMenu() {
    logger.debug("Exiting to menu");
    
    // Hide pause menu first
    this.hidePauseMenu();
    
    try {
      // Call quit game endpoint
      await fetch('/api/quit-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Navigate to menu
      window.location.href = '/';
    } catch (error) {
      logger.error("Error quitting game:", error);
      // Still navigate to menu even if quit call fails
      window.location.href = '/';
    }
  }

  cleanup() {
    // Clean up when leaving the game
    this.hidePauseMenu();
    this.enableGameControls();
    
    if (this.isInitialized) {
      document.removeEventListener('keydown', this.handleEscapeKey.bind(this), true);
    }
    
    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedTime = 0;
    this.isInitialized = false;
    
    logger.debug("Pause menu system cleaned up");
  }

  // Getter methods for external access
  getIsPaused() {
    return this.isPaused;
  }

  getTotalPausedTime() {
    return this.totalPausedTime;
  }
}

// Export the class and create global instance
export { PauseMenuSystem };

// Initialize the pause menu system when the module loads
const pauseMenuSystem = new PauseMenuSystem();
export default pauseMenuSystem;