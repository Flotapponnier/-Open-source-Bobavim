import { showLineNumbers, areLineNumbersVisible } from './lineNumbersVisibility.js';

// Handle responsive scaling
export function updateLineNumbersOnResize() {
  if (areLineNumbersVisible()) {
    // Refresh line numbers to adjust to new size
    showLineNumbers();
  }
}

// Initialize line numbers module
export function initializeLineNumbers() {
  // Listen for window resize to update line numbers
  window.addEventListener('resize', updateLineNumbersOnResize);
}