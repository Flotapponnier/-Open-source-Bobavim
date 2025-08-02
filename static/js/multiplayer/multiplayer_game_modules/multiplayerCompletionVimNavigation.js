// Vim navigation system for multiplayer game completion modal
let currentElementIndex = 0;
let isVimNavigationActive = false;
let availableElements = [];

// Navigation structure for multiplayer game completion modal
const MULTIPLAYER_COMPLETION_NAVIGATION_ELEMENTS = [
  // Leaderboard button (top)
  { selector: '#viewLeaderboard', column: 1, row: 0, type: 'button' },
  
  // Back to menu button (bottom) - START POSITION
  { selector: '#backToMenu', column: 1, row: 1, type: 'button' }
];

export function initializeMultiplayerCompletionVim() {
  logger.debug("Initializing multiplayer completion vim navigation...");
  
  // Find all available elements in the modal
  updateAvailableElements();
  
  // Set initial position to Back to Menu button (as requested - close equivalent)
  currentElementIndex = findBackToMenuIndex();
  isVimNavigationActive = true;
  
  logger.debug(`Multiplayer completion vim starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  logger.debug("Multiplayer completion vim navigation initialized");
}

export function disableMultiplayerCompletionVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress);
  logger.debug("Multiplayer completion vim navigation disabled");
}

function updateAvailableElements() {
  availableElements = [];
  
  // Add static elements
  MULTIPLAYER_COMPLETION_NAVIGATION_ELEMENTS.forEach(nav => {
    const element = document.querySelector(nav.selector);
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
    }
  });
  
  logger.debug("Available multiplayer completion elements:", availableElements.length);
}

function findBackToMenuIndex() {
  // Find Back to Menu button as starting position (close equivalent)
  for (let i = 0; i < availableElements.length; i++) {
    if (availableElements[i].selector === '#backToMenu') {
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
  
  // Only handle keys if we're in the multiplayer completion modal
  const modal = document.getElementById('completionModal');
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
      // h/l don't move in multiplayer completion - only j/k
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
      // h/l don't move in multiplayer completion - only j/k
      break;
    case 'enter':
      event.preventDefault();
      activateCurrentElement();
      break;
    case 'escape':
      event.preventDefault();
      // Close completion modal - click the back to menu button
      clickBackToMenuButton();
      break;
  }
}

function moveUp() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Move from Back to Menu (row 1) to Leaderboard (row 0)
  if (currentNav.selector === '#backToMenu') {
    const leaderboardIndex = availableElements.findIndex(el => el.selector === '#viewLeaderboard');
    if (leaderboardIndex >= 0) {
      currentElementIndex = leaderboardIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#viewLeaderboard') {
    // From Leaderboard, cycle to Back to Menu
    const backToMenuIndex = availableElements.findIndex(el => el.selector === '#backToMenu');
    if (backToMenuIndex >= 0) {
      currentElementIndex = backToMenuIndex;
      updateCursor();
      return;
    }
  }
}

function moveDown() {
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Move from Leaderboard (row 0) to Back to Menu (row 1)
  if (currentNav.selector === '#viewLeaderboard') {
    const backToMenuIndex = availableElements.findIndex(el => el.selector === '#backToMenu');
    if (backToMenuIndex >= 0) {
      currentElementIndex = backToMenuIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#backToMenu') {
    // From Back to Menu, cycle to Leaderboard
    const leaderboardIndex = availableElements.findIndex(el => el.selector === '#viewLeaderboard');
    if (leaderboardIndex >= 0) {
      currentElementIndex = leaderboardIndex;
      updateCursor();
      return;
    }
  }
}

function clickBackToMenuButton() {
  // Find and click the back to menu button
  const backToMenuButton = document.querySelector('#backToMenu');
  if (backToMenuButton) {
    backToMenuButton.click();
  }
}

function updateCursor() {
  logger.debug("Multiplayer completion updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Multiplayer completion current element for cursor:", element);
  
  if (!element) {
    logger.debug("No element found for multiplayer completion cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.multiplayer-completion-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons (remove boba emojis)
  document.querySelectorAll('[data-original-multiplayer-completion-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-multiplayer-completion-text');
    el.removeAttribute('data-original-multiplayer-completion-text');
  });
}

function addCursorToElement(element) {
  if (!element) return;
  
  // For multiplayer completion modal buttons, use fixed positioning cursor (no text modification)
  const cursor = document.createElement('div');
  cursor.className = 'multiplayer-completion-vim-cursor';
  cursor.textContent = '🧋';
  cursor.style.cssText = `
    position: fixed;
    font-size: 20px;
    z-index: 99999;
    pointer-events: none;
    animation: multiplayer-completion-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
  if (!document.getElementById('multiplayer-completion-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'multiplayer-completion-vim-cursor-styles';
    style.textContent = `
      @keyframes multiplayer-completion-vim-cursor-pulse {
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
  logger.debug("Multiplayer completion activating element:", element);
  
  if (!element) {
    logger.debug("No element to activate in multiplayer completion");
    return;
  }
  
  try {
    element.click();
  } catch (e) {
    logger.debug("Error clicking multiplayer completion element:", e);
  }
}

// Export functions for modal management
export function hideMultiplayerCompletionCursor() {
  removeAllCursors();
}

export function showMultiplayerCompletionCursor() {
  if (isVimNavigationActive) {
    updateAvailableElements();
    updateCursor();
  }
}

export function refreshMultiplayerCompletionNavigation() {
  if (isVimNavigationActive) {
    updateAvailableElements();
    // Keep cursor on back to menu button if possible
    currentElementIndex = findBackToMenuIndex();
    updateCursor();
  }
}