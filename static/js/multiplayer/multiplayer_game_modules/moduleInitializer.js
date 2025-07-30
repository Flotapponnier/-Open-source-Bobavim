import { initializeCloudAnimation } from "../../cloud.js";
import { initializeGameMusic } from "../../game_js_modules/gameMusic.js";

export class ModuleInitializer {
  constructor(game) {
    this.game = game;
  }

  initializeGameModules() {
    initializeCloudAnimation();
    const gameMusicManager = initializeGameMusic();
    
    // Set higher volume for multiplayer game music
    setTimeout(() => {
      if (gameMusicManager && gameMusicManager.audio) {
        gameMusicManager.audio.volume = 0.9;
        logger.debug('Multiplayer music volume set to 0.9');
        
        // Override the original toggle function to maintain higher volume
        const originalToggle = gameMusicManager.toggleMusic.bind(gameMusicManager);
        gameMusicManager.toggleMusic = async function() {
          await originalToggle();
          if (this.audio && this.isPlaying) {
            this.audio.volume = 0.9;
          }
        };
      }
    }, 100);
    
    // Apply character-specific game board styling for multiplayer
    this.applyCharacterGameBoardStyling();
    
    setTimeout(() => {
      logger.debug('Initializing game modules for multiplayer...');
      
      this.initializeModule('lineNumbersModule', 'initializeLineNumbers');
      this.initializeModule('relativeLineNumbersModule', 'initializeRelativeLineNumbers');
      this.initializeModule('spaceHighlightModule', 'initializeSpaceHighlight');
      this.initializeModule('tutorialHintsModule', 'initializeTutorialHints');
      
      if (typeof window.scoreAnimationsModule !== 'undefined') {
        window.scoreAnimationsModule.initializeScoreAnimations();
      } else {
        logger.warn('scoreAnimationsModule not found');
      }
      
      this.initializeModule('paragraphModule', 'initializeParagraphSeparation');
      this.initializeModule('fullscreenModule', 'initializeFullscreen');
      this.initializeModule('responsiveScaling', 'initializeResponsiveScaling');
      
      if (typeof window.userPreferencesModule !== 'undefined') {
        window.userPreferencesModule.applySavedPreferences();
      } else {
        logger.warn('userPreferencesModule not found');
      }
    }, 200);
  }

  initializeModule(moduleName, functionName) {
    if (typeof window[moduleName] !== 'undefined' && typeof window[moduleName][functionName] === 'function') {
      window[moduleName][functionName]();
    } else {
      logger.warn(`${moduleName} not found or ${functionName} is not a function`);
    }
  }

  applyCharacterGameBoardStyling() {
    const gameBoard = document.querySelector('.game-board');
    if (!gameBoard) return;
    
    // Get selected character from localStorage or default to 'boba'
    const selectedCharacter = localStorage.getItem('boba_vim_selected_character') || 'boba';
    
    // Remove any existing character-specific classes
    const existingClasses = ['game-board-boba', 'game-board-pinky', 'game-board-golden', 'game-board-black', 'game-board-boba_diamond'];
    existingClasses.forEach(cls => gameBoard.classList.remove(cls));
    
    // Add the new character-specific class
    gameBoard.classList.add(`game-board-${selectedCharacter}`);
    
    logger.debug(`Applied multiplayer game board styling for character: ${selectedCharacter}`);
  }

  disableSoloGameHandlers() {
    window.IS_MULTIPLAYER_ACTIVE = true;
    
    if (window.gameState) {
      window.gameState.isActive = false;
    }
    
    this.game.gameStateManager.initializeClientGameState();
  }
}