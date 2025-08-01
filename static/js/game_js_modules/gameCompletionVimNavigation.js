// Game Completion Vim Navigation System
// Dedicated navigation for game completion modal

let currentElementIndex = 0;
let isVimNavigationActive = false;
let availableElements = [];

// Navigation structure for game completion modal
const COMPLETION_NAVIGATION_ELEMENTS = [
  // Top row
  { selector: '[data-action="leaderboard"]', column: 1, row: 0, type: 'button' },
  
  // Middle row - navigation buttons (h/l)
  { selector: '[data-action="previous-map"]', column: 0, row: 1, type: 'button' },
  { selector: '[data-action="play-same-map"]', column: 1, row: 1, type: 'button' }, // START POSITION
  { selector: '[data-action="next-map"]', column: 2, row: 1, type: 'button' },
  
  // Bottom row
  { selector: '[data-action="back-to-menu"]', column: 1, row: 2, type: 'button' }
];

// Find the Play Same Map button index as start position
const PLAY_SAME_MAP_INDEX = COMPLETION_NAVIGATION_ELEMENTS.findIndex(el => el.selector === '[data-action="play-same-map"]');

export function initializeGameCompletionVim() {
  console.log("Initializing game completion vim navigation...");
  
  // Find all available elements in the modal
  updateAvailableElements();
  
  // Set initial position to Play Same Map button
  currentElementIndex = findStartPosition();
  isVimNavigationActive = true;
  
  console.log(`Game completion vim starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  console.log("Game completion vim navigation initialized");
}

export function disableGameCompletionVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress);
  console.log("Game completion vim navigation disabled");
}

function updateAvailableElements() {
  availableElements = COMPLETION_NAVIGATION_ELEMENTS.filter(nav => {
    const element = document.querySelector(nav.selector);
    return element && isElementVisible(element);
  });
  console.log("Available completion elements:", availableElements.length);
}

function findStartPosition() {
  // Try to find Play Same Map button
  for (let i = 0; i < availableElements.length; i++) {
    if (availableElements[i].selector === '[data-action="play-same-map"]') {
      return i;
    }
  }
  // Fallback to first available element
  return 0;
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

function getCurrentElement() {
  if (currentElementIndex < 0 || currentElementIndex >= availableElements.length) {
    return null;
  }
  
  const navElement = availableElements[currentElementIndex];
  if (!navElement) return null;
  
  try {
    const element = document.querySelector(navElement.selector);
    return element;
  } catch (e) {
    return null;
  }
}

function handleKeyPress(event) {
  if (!isVimNavigationActive) return;
  
  // Don't interfere with input fields
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable) {
    return;
  }
  
  switch(event.key.toLowerCase()) {
    case 'h':
      event.preventDefault();
      moveLeft();
      break;
    case 'j': 
      event.preventDefault();
      moveDown();
      break;
    case 'k':
      event.preventDefault(); 
      moveUp();
      break;
    case 'l':
      event.preventDefault();
      moveRight();
      break;
    case 'enter':
      event.preventDefault();
      activateCurrentElement();
      break;
    case 'escape':
      event.preventDefault();
      // Close completion modal or go back to menu
      const backButton = document.querySelector('[data-action="back-to-menu"]');
      if (backButton) backButton.click();
      break;
  }
}

function moveLeft() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Handle same-row elements (Previous/Play Same/Next)
  if (currentNav.selector === '[data-action="play-same-map"]') {
    // Play Same -> Previous
    const prevIndex = availableElements.findIndex(el => el.selector === '[data-action="previous-map"]');
    if (prevIndex >= 0) {
      currentElementIndex = prevIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="next-map"]') {
    // Next -> Previous (direct navigation)
    const prevIndex = availableElements.findIndex(el => el.selector === '[data-action="previous-map"]');
    if (prevIndex >= 0) {
      currentElementIndex = prevIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="previous-map"]') {
    // Previous -> Next (direct navigation)
    const nextIndex = availableElements.findIndex(el => el.selector === '[data-action="next-map"]');
    if (nextIndex >= 0) {
      currentElementIndex = nextIndex;
      updateCursor();
      return;
    }
  }
  
  // Find elements in left column, preferring same row
  const targetColumn = currentNav.column - 1;
  const finalTargetColumn = targetColumn < 0 ? 2 : targetColumn; // Wrap to right if needed
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === finalTargetColumn) {
      const rowDiff = Math.abs(nav.row - currentNav.row);
      if (rowDiff < bestRowDiff) {
        bestRowDiff = rowDiff;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
  }
}

function moveRight() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Handle same-row elements (Previous/Play Same/Next)
  if (currentNav.selector === '[data-action="previous-map"]') {
    // Previous -> Next (direct navigation)
    const nextIndex = availableElements.findIndex(el => el.selector === '[data-action="next-map"]');
    if (nextIndex >= 0) {
      currentElementIndex = nextIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="play-same-map"]') {
    // Play Same -> Next
    const nextIndex = availableElements.findIndex(el => el.selector === '[data-action="next-map"]');
    if (nextIndex >= 0) {
      currentElementIndex = nextIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="next-map"]') {
    // Next -> Previous (direct navigation)
    const previousIndex = availableElements.findIndex(el => el.selector === '[data-action="previous-map"]');
    if (previousIndex >= 0) {
      currentElementIndex = previousIndex;
      updateCursor();
      return;
    }
  }
  
  // Find elements in right column, preferring same row
  const targetColumn = currentNav.column + 1;
  const finalTargetColumn = targetColumn > 2 ? 0 : targetColumn; // Wrap to left if needed
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === finalTargetColumn) {
      const rowDiff = Math.abs(nav.row - currentNav.row);
      if (rowDiff < bestRowDiff) {
        bestRowDiff = rowDiff;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
  }
}

function moveUp() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Special handling for specific elements going up
  if (currentNav.selector === '[data-action="play-same-map"]') {
    // From Play Same Map, k should go to Leaderboard
    const leaderboardIndex = availableElements.findIndex(el => el.selector === '[data-action="leaderboard"]');
    if (leaderboardIndex >= 0) {
      currentElementIndex = leaderboardIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="next-map"]') {
    // From Next Map, k should go to Play Same Map
    const playSameIndex = availableElements.findIndex(el => el.selector === '[data-action="play-same-map"]');
    if (playSameIndex >= 0) {
      currentElementIndex = playSameIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="previous-map"]') {
    // From Previous Map, k should go to Play Same Map
    const playSameIndex = availableElements.findIndex(el => el.selector === '[data-action="play-same-map"]');
    if (playSameIndex >= 0) {
      currentElementIndex = playSameIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="back-to-menu"]') {
    // From Back to Menu, k should try to go to Next Map first, then Play Same Map
    const nextMapIndex = availableElements.findIndex(el => el.selector === '[data-action="next-map"]');
    if (nextMapIndex >= 0) {
      currentElementIndex = nextMapIndex;
      updateCursor();
      return;
    }
    // If no Next Map, go to Play Same Map
    const playSameIndex = availableElements.findIndex(el => el.selector === '[data-action="play-same-map"]');
    if (playSameIndex >= 0) {
      currentElementIndex = playSameIndex;
      updateCursor();
      return;
    }
  }
  
  // For other elements, find element in same column but higher row (lower row number)
  let bestIndex = -1;
  let bestRow = -1;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === currentNav.column && nav.row < currentNav.row && nav.row > bestRow) {
      bestRow = nav.row;
      bestIndex = i;
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
  }
}

function moveDown() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Special handling for specific elements
  if (currentNav.selector === '[data-action="leaderboard"]') {
    // From Leaderboard, j should go to Play Same Map
    const playSameIndex = availableElements.findIndex(el => el.selector === '[data-action="play-same-map"]');
    if (playSameIndex >= 0) {
      currentElementIndex = playSameIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="play-same-map"]') {
    // From Play Same Map, j should try to go to Next Map first, then Back to Menu
    const nextMapIndex = availableElements.findIndex(el => el.selector === '[data-action="next-map"]');
    if (nextMapIndex >= 0) {
      currentElementIndex = nextMapIndex;
      updateCursor();
      return;
    }
    // If no Next Map, go to Back to Menu
    const backToMenuIndex = availableElements.findIndex(el => el.selector === '[data-action="back-to-menu"]');
    if (backToMenuIndex >= 0) {
      currentElementIndex = backToMenuIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '[data-action="previous-map"]' || currentNav.selector === '[data-action="next-map"]') {
    // From Previous/Next Map, j should go to Back to Menu
    const backToMenuIndex = availableElements.findIndex(el => el.selector === '[data-action="back-to-menu"]');
    if (backToMenuIndex >= 0) {
      currentElementIndex = backToMenuIndex;
      updateCursor();
      return;
    }
  }
  
  // For other elements, find element in same column but lower row (higher row number)
  let bestIndex = -1;
  let bestRow = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === currentNav.column && nav.row > currentNav.row && nav.row < bestRow) {
      bestRow = nav.row;
      bestIndex = i;
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
  }
}

function updateCursor() {
  console.log("Game completion updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement();
  console.log("Game completion current element for cursor:", element);
  
  if (!element) {
    console.log("No element found for game completion cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.game-completion-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons (remove boba emojis)
  document.querySelectorAll('[data-original-completion-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-completion-text');
    el.removeAttribute('data-original-completion-text');
  });
}

function addCursorToElement(element) {
  if (!element) return;
  
  // For completion modal buttons, use fixed positioning cursor (no text modification)
  const cursor = document.createElement('div');
  cursor.className = 'game-completion-vim-cursor';
  cursor.textContent = '🧋';
  cursor.style.cssText = `
    position: fixed;
    font-size: 20px;
    z-index: 99999;
    pointer-events: none;
    animation: completion-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
  if (!document.getElementById('game-completion-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'game-completion-vim-cursor-styles';
    style.textContent = `
      @keyframes completion-vim-cursor-pulse {
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

function activateCurrentElement() {
  const element = getCurrentElement();
  console.log("Game completion activating element:", element);
  
  if (!element) {
    console.log("No element to activate in game completion");
    return;
  }
  
  try {
    element.click();
  } catch (e) {
    console.log("Error clicking game completion element:", e);
  }
}

// Export functions for modal management
export function hideGameCompletionCursor() {
  removeAllCursors();
}

export function showGameCompletionCursor() {
  if (isVimNavigationActive) {
    updateCursor();
  }
}