// Import the new intelligent responsive scaling system
import {
  initializeIntelligentScaling,
  forceIntelligentScaling,
  updateAfterMapChange
} from './responsive_js_modules/intelligentScaling.js';

// Keep old imports for compatibility if needed
import { disableScaling, enableScaling } from './responsive_js_modules/scalingControls.js';
import { isScalingEnabled } from './responsive_js_modules/scalingState.js';

export function initializeResponsiveScaling() {
  logger.debug('🧠 Initializing Intelligent Responsive Scaling System');
  initializeIntelligentScaling();
}

// Export scaling functions for external use (maintaining compatibility)
export function updateScalingAfterMapChange() {
  updateAfterMapChange();
}

export function triggerScaling() {
  forceIntelligentScaling();
}

export function forceScaling() {
  forceIntelligentScaling();
}

export function applyScaling() {
  forceIntelligentScaling();
}

// Keep scaling control exports for compatibility
export { disableScaling, enableScaling, isScalingEnabled };