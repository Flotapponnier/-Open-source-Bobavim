import { showGameBanner, showCorrectMoveBanner, showErrorBanner, resetGameBanner } from '../ui_js_modules/gameBanner.js';

export function showTutorialMessage(message, color) {
  // Determine banner type based on color
  let bannerType = 'normal';
  if (color === window.TUTORIAL_CONFIG.COLORS.CORRECT) {
    bannerType = 'correct';
  } else if (color === window.TUTORIAL_CONFIG.COLORS.WRONG) {
    bannerType = 'error';
  }
  
  // Check if this is a key instruction message
  const isKeyInstruction = message.includes('Press ') || message.includes('to go') || message.includes('You pressed');
  
  showGameBanner(message, bannerType, 0, isKeyInstruction); // No auto-reset in tutorial mode
}

export function resetToWelcomeMessage() {
  resetGameBanner();
}