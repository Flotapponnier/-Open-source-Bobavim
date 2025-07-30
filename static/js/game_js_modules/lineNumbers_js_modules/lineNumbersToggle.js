import { showLineNumbers, hideLineNumbers, areLineNumbersVisible } from './lineNumbersVisibility.js';

export function toggleLineNumbers() {
  if (areLineNumbersVisible()) {
    hideLineNumbers();
    return "Line numbers HIDDEN";
  } else {
    showLineNumbers();
    return "Line numbers SHOWN";
  }
}