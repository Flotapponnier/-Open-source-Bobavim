import { handleKeyDown, handleMapToggle } from './maps_js_modules/mapEventHandlers.js';
import { toggleMapDisplay, isMapVisible } from './maps_js_modules/mapVisibility.js';

export function initializeMapToggle() {
  document.addEventListener("keydown", handleKeyDown);
}

export function toggleMap() {
  return toggleMapDisplay();
}

export { handleMapToggle };
export { isMapVisible } from './maps_js_modules/mapVisibility.js';