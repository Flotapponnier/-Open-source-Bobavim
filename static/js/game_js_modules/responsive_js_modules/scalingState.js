let scalingEnabled = true;
let hasInitialScale = false;

export function isScalingEnabled() {
  return scalingEnabled;
}

export function setScalingEnabled(enabled) {
  scalingEnabled = enabled;
}

export function hasInitialScaleApplied() {
  return hasInitialScale;
}

export function setInitialScaleApplied(applied) {
  hasInitialScale = applied;
}