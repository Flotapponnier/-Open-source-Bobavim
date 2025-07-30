import { initializeGame, gameState } from "./game_js_modules/gameState.js";
import { initializeMovementWithPrediction } from "./game_js_modules/movement.js";
import { initializeTutorialMode } from "./game_js_modules/tutorial.js";
import { initializeMapToggle } from "./game_js_modules/map.js";
import { initializeBackToMenuButton } from "./game_js_modules/navigation.js";
import { initializeResponsiveScaling } from "./game_js_modules/responsive_scaling.js";
import { initializeScalingVariables } from "./game_js_modules/responsive_js_modules/scalingCore.js";
import { initializeVimManual } from "./vimManual.js";
import * as tutorialModule from "./game_js_modules/tutorial.js";
import * as feedbackModule from "./game_js_modules/feedback.js";
import * as displayModule from "./game_js_modules/display.js";
import * as responsiveScaling from "./game_js_modules/responsive_scaling.js";
import * as gameBanner from "./game_js_modules/ui_js_modules/gameBanner.js";
import * as vimManualModule from "./vimManual.js";
import * as mapModule from "./game_js_modules/map.js";
import * as lineNumbersModule from "./game_js_modules/lineNumbers.js";
import * as relativeLineNumbersModule from "./game_js_modules/relativeLineNumbers.js";
import * as spaceHighlightModule from "./game_js_modules/spaceHighlight.js";
import * as fullscreenModule from "./game_js_modules/fullscreen.js";
import * as userPreferencesModule from "./game_js_modules/userPreferences.js";
import * as spriteVisibilityModule from "./game_js_modules/movement_js_modules/spriteVisibility.js";
import * as tutorialHintsModule from "./game_js_modules/tutorialHints.js";
import * as scoreAnimationsModule from "./game_js_modules/scoreAnimations.js";
import * as realTimeUpdatesModule from "./game_js_modules/realTimeUpdates.js";
import * as paragraphModule from "./game_js_modules/paragraph.js";
import * as CONSTANTS from "./game_js_modules/constants.js";
import { intelligentScaling } from "./game_js_modules/responsive_js_modules/intelligentScaling.js";
import { initializeGameSoundEffects } from "./game_js_modules/gameSoundEffects.js";

// Make modules available globally
window.gameState = gameState;
window.tutorialModule = tutorialModule;
window.feedbackModule = feedbackModule;
window.displayModule = displayModule;
window.responsiveScaling = responsiveScaling;
window.gameBanner = gameBanner;
window.vimManualModule = vimManualModule;
window.mapModule = mapModule;
window.lineNumbersModule = lineNumbersModule;
window.relativeLineNumbersModule = relativeLineNumbersModule;
window.spaceHighlightModule = spaceHighlightModule;
window.fullscreenModule = fullscreenModule;
window.userPreferencesModule = userPreferencesModule;
window.spriteVisibilityModule = spriteVisibilityModule;
window.tutorialHintsModule = tutorialHintsModule;
window.scoreAnimationsModule = scoreAnimationsModule;
window.realTimeUpdatesModule = realTimeUpdatesModule;
window.paragraphModule = paragraphModule;
window.intelligentScaling = intelligentScaling;

// Initialize sound effects
initializeGameSoundEffects();

// Make constants globally available
window.MOVEMENT_KEYS = CONSTANTS.MOVEMENT_KEYS;
window.MOVEMENT_MESSAGES = CONSTANTS.MOVEMENT_MESSAGES;
window.BLOCKED_MESSAGES = CONSTANTS.BLOCKED_MESSAGES;
window.VALID_MOVEMENT_KEYS = CONSTANTS.VALID_MOVEMENT_KEYS;
window.TUTORIAL_CONFIG = CONSTANTS.TUTORIAL_CONFIG;
window.TUTORIAL_COMMANDS = CONSTANTS.TUTORIAL_COMMANDS;
window.MAP_CONFIG = CONSTANTS.MAP_CONFIG;
window.FEEDBACK_CONFIG = CONSTANTS.FEEDBACK_CONFIG;
window.API_ENDPOINTS = CONSTANTS.API_ENDPOINTS;
window.UI_SELECTORS = CONSTANTS.UI_SELECTORS;
window.GAME_STATE_DEFAULT = CONSTANTS.GAME_STATE_DEFAULT;

document.addEventListener("DOMContentLoaded", function () {
  // Initialize scaling variables immediately to prevent Safari alignment issues
  if (typeof initializeScalingVariables === 'function') {
    initializeScalingVariables();
    // Force reflow to ensure CSS variables are applied immediately
    document.documentElement.offsetHeight;
  }
  
  // Initialize responsive scaling immediately to ensure correct keyboard layout
  if (typeof initializeResponsiveScaling === 'function') {
    initializeResponsiveScaling();
  }
  
  // Don't initialize solo game if we're in multiplayer mode
  if (window.IS_MULTIPLAYER) {
    logger.debug("Skipping solo game initialization - multiplayer mode detected");
    // Still initialize responsive scaling for multiplayer
    setTimeout(() => {
      if (typeof initializeResponsiveScaling === 'function') {
        initializeResponsiveScaling();
      }
    }, 100);
    return;
  }
  
  initializeGame();
  initializeBackToMenuButton();
  initializeMovementWithPrediction();
  initializeMapToggle();
  initializeTutorialMode();
  initializeVimManual();
  lineNumbersModule.initializeLineNumbers();
  relativeLineNumbersModule.initializeRelativeLineNumbers();
  spaceHighlightModule.initializeSpaceHighlight();
  tutorialHintsModule.initializeTutorialHints();
  scoreAnimationsModule.initializeScoreAnimations();
  realTimeUpdatesModule.initializeRealTimeUpdates();
  paragraphModule.initializeParagraphSeparation();

  // Apply saved user preferences after all modules are initialized
  setTimeout(() => {
    userPreferencesModule.applySavedPreferences();
    scoreAnimationsModule.startScoreMonitoring();
  }, 100);
});
