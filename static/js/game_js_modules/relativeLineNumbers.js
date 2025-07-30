// Relative line numbers module for displaying relative row numbers (vim-style)
import { toggleRelativeLineNumbers } from './relativeLineNumbers_js_modules/relativeLineNumbersToggle.js';
import { showRelativeLineNumbers, hideRelativeLineNumbers, areRelativeLineNumbersVisible, updateRelativeLineNumbersScaling } from './relativeLineNumbers_js_modules/relativeLineNumbersVisibility.js';
import { updateRelativeLineNumbersOnResize, initializeRelativeLineNumbers } from './relativeLineNumbers_js_modules/relativeLineNumbersEvents.js';

export { 
  toggleRelativeLineNumbers, 
  showRelativeLineNumbers, 
  hideRelativeLineNumbers, 
  areRelativeLineNumbersVisible, 
  updateRelativeLineNumbersOnResize, 
  initializeRelativeLineNumbers,
  updateRelativeLineNumbersScaling
};