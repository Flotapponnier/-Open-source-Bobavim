export class ScreenManager {
  constructor(displayManager) {
    this.displayManager = displayManager;
    this.game = displayManager.game;
  }

  showError(message) {
    document.getElementById('multiplayer-loading').style.display = 'none';
    document.getElementById('multiplayer-game-content').style.display = 'none';
    document.getElementById('multiplayer-error').style.display = 'flex';
    document.getElementById('error-message').textContent = message;
    
    this.game.updateConnectionStatus('disconnected', 'Error');
  }

  hideLoading() {
    const loadingElement = document.getElementById('multiplayer-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
      logger.debug('Loading screen hidden');
    } else {
      logger.error('Loading element not found');
    }
  }

  showGameContent() {
    const gameContentElement = document.getElementById('multiplayer-game-content');
    if (gameContentElement) {
      gameContentElement.style.display = 'block';
      logger.debug('Game content shown');
    } else {
      logger.error('Game content element not found');
    }
  }
}