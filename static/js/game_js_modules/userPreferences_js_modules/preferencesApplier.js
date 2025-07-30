import { getUserPreferences } from './preferencesStorage.js';

// Apply saved preferences when game loads
export function applySavedPreferences() {
  const preferences = getUserPreferences();
  logger.debug('Applying saved preferences:', preferences);
  
  // Apply line numbers preference (mutually exclusive with relative line numbers)
  if (preferences.lineNumbers && window.lineNumbersModule) {
    window.lineNumbersModule.showLineNumbers();
  }
  
  // Apply relative line numbers preference (mutually exclusive with absolute line numbers)
  if (preferences.relativeLineNumbers && window.relativeLineNumbersModule) {
    window.relativeLineNumbersModule.showRelativeLineNumbers();
  }
  
  // Apply character visibility preference
  if (!preferences.characterVisible) {
    // Hide characters if preference is set to false
    if (window.spriteVisibilityModule && window.spriteVisibilityModule.hideSprites) {
      window.spriteVisibilityModule.hideSprites();
    }
  }
  
  // Apply space highlighting preference
  if (preferences.spaceHighlighting && window.spaceHighlightModule) {
    window.spaceHighlightModule.showSpaceHighlight();
  }
  
  // Apply fullscreen preference
  if (preferences.fullscreen && window.fullscreenModule) {
    window.fullscreenModule.applyFullscreenPreference();
  }
  
  return preferences;
}