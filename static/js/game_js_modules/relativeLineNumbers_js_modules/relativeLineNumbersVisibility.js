import { 
  isRelativeLineNumbersVisible, 
  setRelativeLineNumbersVisible, 
  getRelativeLineNumberElements, 
  addRelativeLineNumberElement, 
  clearRelativeLineNumberElements 
} from './relativeLineNumbersState.js';

// Function to find the current player position
function findPlayerPosition() {
  const keyboardContainer = document.querySelector('.keyboard-map');
  if (!keyboardContainer) return null;
  
  // Find the element with data-map="1" (player position)
  const playerElement = keyboardContainer.querySelector('[data-map="1"]');
  if (!playerElement) return null;
  
  const row = parseInt(playerElement.getAttribute('data-row'));
  const col = parseInt(playerElement.getAttribute('data-col'));
  
  return { row, col };
}

export function showRelativeLineNumbers() {
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

  // Remove existing relative line numbers first
  hideRelativeLineNumbers();

  // Find player position for relative numbering
  const playerPos = findPlayerPosition();
  const currentRow = playerPos ? playerPos.row : 0;

  logger.debug(`Found ${keyboardRows.length} keyboard rows for relative line numbering, player at row ${currentRow}`);

  keyboardRows.forEach((row, index) => {
    const relativeLineNumber = document.createElement('div');
    relativeLineNumber.className = 'relative-line-number';
    
    // Calculate relative number: distance from current line
    const relativeNum = Math.abs(index - currentRow);
    relativeLineNumber.textContent = relativeNum === 0 ? (index + 1).toString() : relativeNum.toString();
    
    // Get current responsive font size from CSS custom properties
    const root = document.documentElement;
    const keyFontSize = parseFloat(root.style.getPropertyValue('--key-font-size')) || 14;
    const keySize = parseFloat(root.style.getPropertyValue('--key-size')) || 50;
    
    // Calculate proportional font size for relative line numbers (slightly smaller than key font)
    const lineNumberFontSize = Math.max(8, keyFontSize * 0.85);
    
    // Calculate proportional positioning and padding based on key size
    const leftOffset = Math.max(25, keySize * 0.7);
    const padding = Math.max(2, keySize * 0.08);
    const borderRadius = Math.max(2, keySize * 0.08);
    const minWidth = Math.max(12, keySize * 0.4);
    
    // Different color scheme for relative numbers
    const backgroundColor = relativeNum === 0 ? 'rgba(255, 215, 0, 0.9)' : 'rgba(0, 100, 0, 0.8)';
    const textColor = relativeNum === 0 ? '#000' : '#90EE90';
    const borderColor = relativeNum === 0 ? '#FFD700' : '#90EE90';
    
    relativeLineNumber.style.cssText = `
      position: absolute;
      left: -${leftOffset}px;
      top: 50%;
      transform: translateY(-50%);
      color: ${textColor};
      font-family: 'Courier New', monospace;
      font-size: ${lineNumberFontSize}px;
      font-weight: bold;
      background: ${backgroundColor};
      padding: ${padding}px ${padding + 2}px;
      border-radius: ${borderRadius}px;
      min-width: ${minWidth}px;
      text-align: center;
      user-select: none;
      z-index: 100;
      border: 1px solid ${borderColor};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      white-space: nowrap;
    `;

    // Make the parent row position relative if it isn't already
    if (getComputedStyle(row).position === 'static') {
      row.style.position = 'relative';
    }

    row.appendChild(relativeLineNumber);
    addRelativeLineNumberElement(relativeLineNumber);
  });

  setRelativeLineNumbersVisible(true);
  logger.debug(`Added ${getRelativeLineNumberElements().length} relative line numbers to keyboard rows`);
}

export function hideRelativeLineNumbers() {
  const elements = getRelativeLineNumberElements();
  elements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  clearRelativeLineNumberElements();
  setRelativeLineNumbersVisible(false);
}

export function areRelativeLineNumbersVisible() {
  return isRelativeLineNumbersVisible();
}

export function updateRelativeLineNumbersScaling() {
  // Update relative line numbers scaling when responsive scaling changes
  if (areRelativeLineNumbersVisible()) {
    const elements = getRelativeLineNumberElements();
    if (elements.length > 0) {
      // Re-apply scaling to existing relative line numbers
      showRelativeLineNumbers();
    }
  }
}