import { clearCurrentTutorialCommand } from './tutorialState.js';
import { generateRandomTutorialCommand } from './tutorialCommands.js';
import { showTutorialMessage, resetToWelcomeMessage } from './tutorialUI.js';

export function toggleTutorialMode() {
  window.gameState.tutorialMode = !window.gameState.tutorialMode;

  if (window.gameState.tutorialMode) {
    activateTutorialMode();
  } else {
    deactivateTutorialMode();
  }
}

function activateTutorialMode() {
  showTutorialMessage(
    window.TUTORIAL_CONFIG.MESSAGES.ACTIVATED,
    window.TUTORIAL_CONFIG.COLORS.ACTIVATED,
  );

  setTimeout(() => {
    generateRandomTutorialCommand();
  }, window.TUTORIAL_CONFIG.TIMINGS.ACTIVATION_DELAY);
}

function deactivateTutorialMode() {
  clearCurrentTutorialCommand();
  
  // Show deactivation message in UI banner
  showTutorialMessage(
    window.TUTORIAL_CONFIG.MESSAGES.DEACTIVATED,
    window.TUTORIAL_CONFIG.COLORS.ACTIVATED,
  );
  
  // Reset to welcome message after a delay
  setTimeout(() => {
    resetToWelcomeMessage();
  }, 2000);
}