import { setScalingEnabled } from './scalingState.js';
import { applyScaling } from './scalingCore.js';
import { RESPONSIVE_CONFIG } from '../constants_js_modules/responsive.js';

export function disableScaling() {
  setScalingEnabled(false);
  // Completely disable any scaling transitions to prevent visual jumps
  const keyboardMap = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.KEYBOARD_MAP);
  if (keyboardMap) {
    keyboardMap.style.transition = 'none';
    // Lock the current transform to prevent any changes
    const currentTransform = keyboardMap.style.transform;
    keyboardMap.style.transform = currentTransform;
  }
}

export function enableScaling() {
  setScalingEnabled(true);
  // Re-enable transition
  const keyboardMap = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.KEYBOARD_MAP);
  if (keyboardMap) {
    keyboardMap.style.transition = RESPONSIVE_CONFIG.CSS_PROPERTIES.TRANSITION;
  }
  applyScaling();
}