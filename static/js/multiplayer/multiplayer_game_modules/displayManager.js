import { GameMapRenderer } from "./displayManager_modules/gameMapRenderer.js";
import { SpriteManager } from "./displayManager_modules/spriteManager.js";
import { UIUpdater } from "./displayManager_modules/uiUpdater.js";
import { DisplayUtils } from "./displayManager_modules/displayUtils.js";
import { ScreenManager } from "./displayManager_modules/screenManager.js";

export class DisplayManager {
  constructor(game) {
    this.game = game;
    this.lastDisplayUpdate = 0;
    this.displayUpdateThrottle = 16; // ~60fps limit
    this.pendingDisplayUpdate = false;
    this.needsInitialCleanup = true;
    this.lastForceUpdate = 0;

    // Initialize submodules
    this.gameMapRenderer = new GameMapRenderer(this);
    this.spriteManager = new SpriteManager(this);
    this.uiUpdater = new UIUpdater(this);
    this.displayUtils = new DisplayUtils(this);
    this.screenManager = new ScreenManager(this);
  }

  updateGameDisplay() {
    if (!this.game.clientGameState) {
      logger.error('❌ Cannot update display - no client game state');
      return;
    }

    logger.debug('🎨 UPDATING GAME DISPLAY:', {
      player1: JSON.stringify(this.game.clientGameState.player1?.position),
      player2: JSON.stringify(this.game.clientGameState.player2?.position),
      pearl: JSON.stringify(this.game.clientGameState.pearl_position)
    });

    this.uiUpdater.updateScores();
    this.uiUpdater.updatePlayerNames();
    this.uiUpdater.updatePlayerAvatars();

    this.gameMapRenderer.updateClientGameMap();
    this.gameMapRenderer.updateGameMapOptimized();
    this.uiUpdater.updateDebugInfo();
    this.game.gameStateManager.updateClientGameStateForPrediction();
  }

  updateGameDisplayOptimized() {
    if (!this.game.clientGameState) {
      logger.error('❌ Cannot update display - no client game state');
      return;
    }

    this.uiUpdater.updateScoresAndDebug();
    this.gameMapRenderer.updateGameMapOptimized();
    this.game.gameStateManager.updateClientGameStateForPrediction();
  }

  // Delegate methods to submodules
  updateClientGameMap() {
    this.gameMapRenderer.updateClientGameMap();
  }

  updateGameMapOptimized() {
    this.gameMapRenderer.updateGameMapOptimized();
  }

  throttledDisplayUpdate() {
    this.displayUtils.throttledDisplayUpdate();
  }

  showError(message) {
    this.screenManager.showError(message);
  }

  hideLoading() {
    this.screenManager.hideLoading();
  }

  showGameContent() {
    this.screenManager.showGameContent();
  }
}