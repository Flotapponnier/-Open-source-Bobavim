import { enterFullscreen, exitFullscreen } from './fullscreenToggle.js';

export function applyFullscreenPreference() {
  if (window.userPreferencesModule) {
    const preferences = window.userPreferencesModule.getUserPreferences();
    const fullscreenEnabled = preferences.fullscreen || false;
    
    if (fullscreenEnabled) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }
}