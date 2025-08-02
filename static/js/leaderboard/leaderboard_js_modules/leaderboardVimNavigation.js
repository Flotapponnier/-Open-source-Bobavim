// Vim navigation system for leaderboard modal
let currentElementIndex = 0;
let isVimNavigationActive = false;
let availableElements = [];

// Navigation structure for leaderboard modal
const LEADERBOARD_NAVIGATION_ELEMENTS = [
  // Header section
  { selector: '#leaderboardModeToggle', column: 1, row: 0, type: 'button' },
  
  // Footer navigation buttons (will be populated dynamically)
  // Map buttons in footer-map-buttons
  // Close button
  { selector: '.close-modal-footer', column: 1, row: 2, type: 'button' }
];

let mapButtons = []; // Will store map button selectors dynamically

export function initializeLeaderboardVim(modal) {
  logger.debug("Initializing leaderboard vim navigation...");
  
  if (!modal) {
    logger.warn("No modal provided for leaderboard vim navigation");
    return;
  }
  
  // Find all available elements in the modal
  updateAvailableElements(modal);
  
  // Set initial position to Close button (as requested)
  currentElementIndex = findCloseButtonIndex();
  isVimNavigationActive = true;
  
  logger.debug(`Leaderboard vim starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor(modal);
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  logger.debug("Leaderboard vim navigation initialized");
}

export function disableLeaderboardVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress);
  logger.debug("Leaderboard vim navigation disabled");
}

function updateAvailableElements(modal) {
  availableElements = [];
  mapButtons = [];
  
  // Add static elements
  LEADERBOARD_NAVIGATION_ELEMENTS.forEach(nav => {
    const element = modal.querySelector(nav.selector);
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
    }
  });
  
  // Add map buttons dynamically
  const mapButtonElements = modal.querySelectorAll('.footer-map-btn');
  mapButtonElements.forEach((button, index) => {
    const selector = `.footer-map-btn[data-map="${button.dataset.map}"]`;
    const navElement = {
      selector: selector,
      column: index % 4, // 4 columns max
      row: 1 + Math.floor(index / 4), // Start at row 1, add rows as needed
      type: 'map-button'
    };
    mapButtons.push(navElement);
    availableElements.push(navElement);
  });
  
  // Sort by row then column for predictable navigation
  availableElements.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.column - b.column;
  });
  
  logger.debug("Available leaderboard elements:", availableElements.length);
}

function findCloseButtonIndex() {
  // Find Close button as starting position
  for (let i = 0; i < availableElements.length; i++) {
    if (availableElements[i].selector === '.close-modal-footer') {
      return i;
    }
  }
  // Fallback to last available element
  return Math.max(0, availableElements.length - 1);
}

function isElementVisible(element) {
  if (!element) return false;
  try {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0 &&
           !element.hasAttribute('disabled') &&
           !element.classList.contains('hidden');
  } catch (e) {
    return false;
  }
}

function getCurrentElement(modal) {
  if (currentElementIndex < 0 || currentElementIndex >= availableElements.length) {
    return null;
  }
  
  const navElement = availableElements[currentElementIndex];
  if (!navElement) return null;
  
  try {
    const element = modal.querySelector(navElement.selector);
    return element;
  } catch (e) {
    return null;
  }
}

function handleKeyPress(event) {
  if (!isVimNavigationActive) return;
  
  // Only handle keys if we're in the leaderboard modal
  const modal = document.querySelector('.leaderboard-modal-overlay');
  if (!modal) return;
  
  // Don't interfere with input fields
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable) {
    return;
  }
  
  switch(event.key.toLowerCase()) {
    case 'h':
      event.preventDefault();
      moveLeft(modal);
      break;
    case 'j': 
      event.preventDefault();
      moveDown(modal);
      break;
    case 'k':
      event.preventDefault(); 
      moveUp(modal);
      break;
    case 'l':
      event.preventDefault();
      moveRight(modal);
      break;
    case 'enter':
      event.preventDefault();
      activateCurrentElement(modal);
      break;
    case 'escape':
      event.preventDefault();
      // Close leaderboard modal
      const closeButton = modal.querySelector('.close-modal-footer');
      if (closeButton) closeButton.click();
      break;
  }
}

function moveLeft(modal) {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // For map buttons, move sequentially to previous button
  if (currentNav.type === 'map-button') {
    // Get all map buttons in their natural order
    const mapButtons = availableElements.filter(el => el.type === 'map-button');
    const currentMapIndex = mapButtons.findIndex(el => el === currentNav);
    
    if (currentMapIndex > 0) {
      // Go to previous map button
      const previousMapButton = mapButtons[currentMapIndex - 1];
      const newIndex = availableElements.findIndex(el => el === previousMapButton);
      if (newIndex >= 0) {
        currentElementIndex = newIndex;
        updateCursor(modal);
        return;
      }
    } else {
      // Wrap to last map button
      const lastMapButton = mapButtons[mapButtons.length - 1];
      const newIndex = availableElements.findIndex(el => el === lastMapButton);
      if (newIndex >= 0) {
        currentElementIndex = newIndex;
        updateCursor(modal);
        return;
      }
    }
  }
  
  // General left movement for non-map buttons - find element in left column, preferring same row
  const targetColumn = currentNav.column - 1;
  const finalTargetColumn = targetColumn < 0 ? getMaxColumn() : targetColumn;
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === finalTargetColumn && nav.type !== 'map-button') {
      const rowDiff = Math.abs(nav.row - currentNav.row);
      if (rowDiff < bestRowDiff) {
        bestRowDiff = rowDiff;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor(modal);
  }
}

function moveRight(modal) {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // For map buttons, move sequentially to next button
  if (currentNav.type === 'map-button') {
    // Get all map buttons in their natural order
    const mapButtons = availableElements.filter(el => el.type === 'map-button');
    const currentMapIndex = mapButtons.findIndex(el => el === currentNav);
    
    if (currentMapIndex < mapButtons.length - 1) {
      // Go to next map button
      const nextMapButton = mapButtons[currentMapIndex + 1];
      const newIndex = availableElements.findIndex(el => el === nextMapButton);
      if (newIndex >= 0) {
        currentElementIndex = newIndex;
        updateCursor(modal);
        return;
      }
    } else {
      // Wrap to first map button
      const firstMapButton = mapButtons[0];
      const newIndex = availableElements.findIndex(el => el === firstMapButton);
      if (newIndex >= 0) {
        currentElementIndex = newIndex;
        updateCursor(modal);
        return;
      }
    }
  }
  
  // General right movement for non-map buttons - find element in right column, preferring same row
  const targetColumn = currentNav.column + 1;
  const maxCol = getMaxColumn();
  const finalTargetColumn = targetColumn > maxCol ? 0 : targetColumn;
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === finalTargetColumn && nav.type !== 'map-button') {
      const rowDiff = Math.abs(nav.row - currentNav.row);
      if (rowDiff < bestRowDiff) {
        bestRowDiff = rowDiff;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor(modal);
  }
}

function moveUp(modal) {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Special navigation rules based on current element
  if (currentNav.selector === '.close-modal-footer') {
    // From Close button, k should go to mode toggle (skip map buttons)
    const modeToggleIndex = availableElements.findIndex(el => el.selector === '#leaderboardModeToggle');
    if (modeToggleIndex >= 0) {
      currentElementIndex = modeToggleIndex;
      updateCursor(modal);
      return;
    }
  } else if (currentNav.type === 'map-button') {
    // From ANY map button, k should ALWAYS go to mode toggle (exit map button area)
    const modeToggleIndex = availableElements.findIndex(el => el.selector === '#leaderboardModeToggle');
    if (modeToggleIndex >= 0) {
      currentElementIndex = modeToggleIndex;
      updateCursor(modal);
      return;
    }
  } else if (currentNav.selector === '#leaderboardModeToggle') {
    // From mode toggle, k should cycle to close button
    const closeIndex = availableElements.findIndex(el => el.selector === '.close-modal-footer');
    if (closeIndex >= 0) {
      currentElementIndex = closeIndex;
      updateCursor(modal);
      return;
    }
  }
}

function moveDown(modal) {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Special navigation rules based on current element
  if (currentNav.selector === '#leaderboardModeToggle') {
    // From mode toggle, j should go to first map button or close
    const firstMapButton = availableElements.find(el => el.type === 'map-button');
    if (firstMapButton) {
      const newIndex = availableElements.findIndex(el => el === firstMapButton);
      if (newIndex >= 0) {
        currentElementIndex = newIndex;
        updateCursor(modal);
        return;
      }
    }
    
    // Fallback to close button if no map buttons
    const closeIndex = availableElements.findIndex(el => el.selector === '.close-modal-footer');
    if (closeIndex >= 0) {
      currentElementIndex = closeIndex;
      updateCursor(modal);
      return;
    }
  } else if (currentNav.type === 'map-button') {
    // From ANY map button, j should ALWAYS go to close button (exit map button area)
    const closeIndex = availableElements.findIndex(el => el.selector === '.close-modal-footer');
    if (closeIndex >= 0) {
      currentElementIndex = closeIndex;
      updateCursor(modal);
      return;
    }
  } else if (currentNav.selector === '.close-modal-footer') {
    // From close button, j should cycle to mode toggle
    const modeToggleIndex = availableElements.findIndex(el => el.selector === '#leaderboardModeToggle');
    if (modeToggleIndex >= 0) {
      currentElementIndex = modeToggleIndex;
      updateCursor(modal);
      return;
    }
  }
}

function getMaxColumn() {
  return Math.max(...availableElements.map(el => el.column));
}

function getMapButtonRows() {
  return [...new Set(availableElements.filter(el => el.type === 'map-button').map(el => el.row))];
}

function updateCursor(modal) {
  logger.debug("Leaderboard updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement(modal);
  logger.debug("Leaderboard current element for cursor:", element);
  
  if (!element) {
    logger.debug("No element found for leaderboard cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.leaderboard-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons (remove boba emojis)
  document.querySelectorAll('[data-original-leaderboard-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-leaderboard-text');
    el.removeAttribute('data-original-leaderboard-text');
  });
}

function addCursorToElement(element) {
  if (!element) return;
  
  // For leaderboard modal buttons, use fixed positioning cursor (no text modification)
  const cursor = document.createElement('div');
  cursor.className = 'leaderboard-vim-cursor';
  cursor.textContent = '🧋';
  cursor.style.cssText = `
    position: fixed;
    font-size: 20px;
    z-index: 99999;
    pointer-events: none;
    animation: leaderboard-vim-cursor-pulse 1s ease-in-out infinite alternate;
    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 1)) drop-shadow(0 0 8px rgba(0, 0, 0, 1));
    background: rgba(255, 165, 0, 0.8);
    border: 2px solid white;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.8);
  `;
  
  // Position cursor relative to element's position on screen
  const rect = element.getBoundingClientRect();
  cursor.style.top = (rect.top - 10) + 'px';
  cursor.style.left = (rect.left - 10) + 'px';
  
  // Add cursor to body
  document.body.appendChild(cursor);
  
  // Add CSS animation if not already present
  if (!document.getElementById('leaderboard-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'leaderboard-vim-cursor-styles';
    style.textContent = `
      @keyframes leaderboard-vim-cursor-pulse {
        0% { 
          transform: scale(1) rotate(-5deg); 
          opacity: 0.9; 
        }
        100% { 
          transform: scale(1.15) rotate(5deg); 
          opacity: 1; 
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function activateCurrentElement(modal) {
  const element = getCurrentElement(modal);
  logger.debug("Leaderboard activating element:", element);
  
  if (!element) {
    logger.debug("No element to activate in leaderboard");
    return;
  }
  
  try {
    element.click();
  } catch (e) {
    logger.debug("Error clicking leaderboard element:", e);
  }
}

// Export functions for modal management
export function hideLeaderboardCursor() {
  removeAllCursors();
}

export function showLeaderboardCursor(modal) {
  if (isVimNavigationActive && modal) {
    updateAvailableElements(modal);
    updateCursor(modal);
  }
}

export function refreshLeaderboardNavigation(modal) {
  if (isVimNavigationActive && modal) {
    updateAvailableElements(modal);
    // Keep cursor on close button if possible
    currentElementIndex = findCloseButtonIndex();
    updateCursor(modal);
  }
}