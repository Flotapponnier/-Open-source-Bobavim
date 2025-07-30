import { showNormalBanner } from '../ui_js_modules/gameBanner.js';

export function showMapToggleFeedback(message) {
  // Use the normal wood banner like tutorial mode
  showNormalBanner(message, 0); // No auto-reset, stays until next action
}