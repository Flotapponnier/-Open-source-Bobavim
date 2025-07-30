import { showRelativeLineNumbers, hideRelativeLineNumbers, areRelativeLineNumbersVisible } from './relativeLineNumbersVisibility.js';

export function toggleRelativeLineNumbers() {
  if (areRelativeLineNumbersVisible()) {
    hideRelativeLineNumbers();
    return "Relative line numbers HIDDEN";
  } else {
    showRelativeLineNumbers();
    return "Relative line numbers SHOWN";
  }
}