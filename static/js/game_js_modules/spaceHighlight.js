// Space highlighting module for visually highlighting space characters
import { toggleSpaceHighlight } from './spaceHighlight_js_modules/spaceHighlightToggle.js';
import { showSpaceHighlight, hideSpaceHighlight, isSpaceHighlightActive } from './spaceHighlight_js_modules/spaceHighlightVisibility.js';
import { updateSpaceHighlightOnResize, initializeSpaceHighlight } from './spaceHighlight_js_modules/spaceHighlightEvents.js';

export { 
  toggleSpaceHighlight, 
  showSpaceHighlight, 
  hideSpaceHighlight, 
  isSpaceHighlightActive, 
  updateSpaceHighlightOnResize, 
  initializeSpaceHighlight 
};