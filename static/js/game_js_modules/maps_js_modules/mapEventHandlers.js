import { isMapVisible, toggleMapDisplay } from './mapVisibility.js';
import { showMapToggleFeedback } from './mapMessages.js';

export function handleKeyDown(event) {
  // Map toggle now handled by Space+M combination in movement handler
  // Old key binding (-) disabled
}

export function handleMapToggle() {
  const wasVisible = isMapVisible();
  toggleMapDisplay();
  const isNowVisible = isMapVisible();

  const statusMessage = isNowVisible
    ? window.MAP_CONFIG.MESSAGES.SHOWN
    : window.MAP_CONFIG.MESSAGES.HIDDEN;
  const fullMessage = `${window.MAP_CONFIG.MESSAGES.TOGGLE} | ${statusMessage}`;

  if (!window.gameState.tutorialMode) {
    showMapToggleFeedback(fullMessage);
  }
}