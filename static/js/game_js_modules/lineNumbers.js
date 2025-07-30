// Line numbers module for displaying row numbers
import { toggleLineNumbers } from './lineNumbers_js_modules/lineNumbersToggle.js';
import { showLineNumbers, hideLineNumbers, areLineNumbersVisible, updateLineNumbersScaling } from './lineNumbers_js_modules/lineNumbersVisibility.js';
import { updateLineNumbersOnResize, initializeLineNumbers } from './lineNumbers_js_modules/lineNumbersEvents.js';

export { 
  toggleLineNumbers, 
  showLineNumbers, 
  hideLineNumbers, 
  areLineNumbersVisible, 
  updateLineNumbersOnResize, 
  initializeLineNumbers,
  updateLineNumbersScaling
};