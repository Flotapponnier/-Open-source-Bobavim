import { 
  isLineNumbersVisible, 
  setLineNumbersVisible, 
  getLineNumberElements, 
  addLineNumberElement, 
  clearLineNumberElements 
} from './lineNumbersState.js';

export function showLineNumbers() {
  const keyboardContainer = document.querySelector('.keyboard-map');
  if (!keyboardContainer) {
    logger.debug('Keyboard map container not found');
    return;
  }

  const keyboardRows = keyboardContainer.querySelectorAll('.keyboard-row');
  if (!keyboardRows.length) {
    logger.debug('No keyboard rows found');
    return;
  }

  // Remove existing line numbers first
  hideLineNumbers();

  logger.debug(`Found ${keyboardRows.length} keyboard rows for line numbering`);

  keyboardRows.forEach((row, index) => {
    const lineNumber = document.createElement('div');
    lineNumber.className = 'line-number';
    lineNumber.textContent = (index + 1).toString();
    
    // Get current responsive font size from CSS custom properties
    const root = document.documentElement;
    const keyFontSize = parseFloat(root.style.getPropertyValue('--key-font-size')) || 14;
    const keySize = parseFloat(root.style.getPropertyValue('--key-size')) || 50;
    
    // Calculate proportional font size for line numbers (slightly smaller than key font)
    const lineNumberFontSize = Math.max(8, keyFontSize * 0.85);
    
    // Calculate proportional positioning and padding based on key size
    const leftOffset = Math.max(25, keySize * 0.7);
    const padding = Math.max(2, keySize * 0.08);
    const borderRadius = Math.max(2, keySize * 0.08);
    const minWidth = Math.max(12, keySize * 0.4);
    
    lineNumber.style.cssText = `
      position: absolute;
      left: -${leftOffset}px;
      top: 50%;
      transform: translateY(-50%);
      color: #FFD700;
      font-family: 'Courier New', monospace;
      font-size: ${lineNumberFontSize}px;
      font-weight: bold;
      background: rgba(0,0,0,0.8);
      padding: ${padding}px ${padding + 2}px;
      border-radius: ${borderRadius}px;
      min-width: ${minWidth}px;
      text-align: center;
      user-select: none;
      z-index: 100;
      border: 1px solid #FFD700;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      white-space: nowrap;
    `;

    // Make the parent row position relative if it isn't already
    if (getComputedStyle(row).position === 'static') {
      row.style.position = 'relative';
    }

    row.appendChild(lineNumber);
    addLineNumberElement(lineNumber);
  });

  setLineNumbersVisible(true);
  logger.debug(`Added ${getLineNumberElements().length} line numbers to keyboard rows`);
}

export function hideLineNumbers() {
  const elements = getLineNumberElements();
  elements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  clearLineNumberElements();
  setLineNumbersVisible(false);
}

export function areLineNumbersVisible() {
  return isLineNumbersVisible();
}

export function updateLineNumbersScaling() {
  // Update line numbers scaling when responsive scaling changes
  if (areLineNumbersVisible()) {
    const elements = getLineNumberElements();
    if (elements.length > 0) {
      // Re-apply scaling to existing line numbers
      showLineNumbers();
    }
  }
}