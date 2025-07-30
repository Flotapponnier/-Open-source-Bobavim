import { areRelativeLineNumbersVisible, showRelativeLineNumbers } from './relativeLineNumbersVisibility.js';

// Handle responsive scaling - refresh relative line numbers when screen resizes
export function updateRelativeLineNumbersOnResize() {
  if (areRelativeLineNumbersVisible()) {
    // Refresh relative line numbers to ensure they maintain styling after resize
    showRelativeLineNumbers();
  }
}

// Initialize relative line numbers module
export function initializeRelativeLineNumbers() {
  // Listen for window resize to update relative line numbers
  window.addEventListener('resize', updateRelativeLineNumbersOnResize);
  
  // Listen for player movement to update relative numbering
  document.addEventListener('playerMoved', updateRelativeLineNumbersOnPlayerMove);
  
  logger.debug('Relative line numbers module initialized');
}

// Update relative line numbers when player moves
function updateRelativeLineNumbersOnPlayerMove() {
  if (areRelativeLineNumbersVisible()) {
    // Refresh relative line numbers to recalculate distances from new position
    showRelativeLineNumbers();
  }
}