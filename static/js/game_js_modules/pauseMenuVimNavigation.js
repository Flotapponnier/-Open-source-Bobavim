// Pause Menu Vim Navigation System
// Dedicated navigation for pause menu modal with jk movement

let currentElementIndex = 0;
let isVimNavigationActive = false;
let availableElements = [];

// Navigation structure for pause menu - Play Again is the default start position
const PAUSE_MENU_NAVIGATION_ELEMENTS = [
  { selector: '#resumeGameBtn', column: 0, row: 0, type: 'button', action: 'resume' },
  { selector: '#restartGameBtn', column: 0, row: 1, type: 'button', action: 'restart' }, // START POSITION
  { selector: '#exitToMenuBtn', column: 0, row: 2, type: 'button', action: 'exit' }
];

export function initializePauseMenuVim() {
  logger.debug("Initializing pause menu vim navigation...");
  
  // Find all available elements in the modal
  updateAvailableElements();
  
  // Set initial position to Play Again button (index 1)
  currentElementIndex = 1;
  isVimNavigationActive = true;
  
  logger.debug(`Pause menu vim starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners with capture to intercept before game handlers
  document.addEventListener('keydown', handleKeyPress, true);
  
  logger.debug("Pause menu vim navigation initialized");
}

export function disablePauseMenuVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress, true);
  logger.debug("Pause menu vim navigation disabled");
}

function updateAvailableElements() {
  availableElements = [];
  
  logger.debug("Updating available elements for pause menu");
  
  // Add elements for pause menu
  PAUSE_MENU_NAVIGATION_ELEMENTS.forEach(nav => {
    const element = document.querySelector(nav.selector);
    logger.debug(`Looking for element with selector: ${nav.selector}`, element ? 'FOUND' : 'NOT FOUND');
    
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
      logger.debug(`Added element ${nav.selector} to navigation`);
    }
  });
  
  logger.debug("Available pause menu elements:", availableElements.length);
}

function isElementVisible(element) {
  if (!element) return false;
  try {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const isVisible = style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0 &&
           !element.hasAttribute('disabled') &&
           !element.classList.contains('hidden');
    
    return isVisible;
  } catch (e) {
    logger.debug(`Pause menu: Error checking visibility:`, e);
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
  // Only handle keys if pause menu vim navigation is active
  if (!isVimNavigationActive) return;
  
  // Check if we're in the pause menu modal
  const pauseModal = document.getElementById('pauseMenuModal');
  const isPauseModalOpen = pauseModal && !pauseModal.classList.contains('hidden');
  
  if (!isPauseModalOpen) {
    logger.debug("Pause menu: Key ignored - modal not visible");
    return;
  }
  
  // Don't interfere with input fields (though pause menu shouldn't have any)
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable) {
    return;
  }
  
  logger.debug("Pause menu: Key pressed:", event.key);
  
  switch(event.key.toLowerCase()) {
    case 'j': 
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      moveDown();
      break;
    case 'k':
      event.preventDefault(); 
      event.stopPropagation();
      event.stopImmediatePropagation();
      moveUp();
      break;
    case 'enter':
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      activateCurrentElement();
      break;
    case 'escape':
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      // Escape should resume the game (same as clicking Resume)
      resumeGame();
      break;
    // Disable hjl keys in pause menu to avoid confusion
    case 'h':
    case 'l':
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      break;
  }
}

function moveUp() {
  if (availableElements.length <= 1) return;
  
  // Move to previous element (up in the list)
  currentElementIndex = currentElementIndex > 0 ? currentElementIndex - 1 : availableElements.length - 1;
  updateCursor();
  logger.debug(`Pause menu: Moved up to index ${currentElementIndex}`);
}

function moveDown() {
  if (availableElements.length <= 1) return;
  
  // Move to next element (down in the list)
  currentElementIndex = currentElementIndex < availableElements.length - 1 ? currentElementIndex + 1 : 0;
  updateCursor();
  logger.debug(`Pause menu: Moved down to index ${currentElementIndex}`);
}

function updateCursor() {
  logger.debug("Pause menu: updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Pause menu: Current element for cursor:", element);
  
  if (!element) {
    logger.debug("No element found for pause menu cursor");
    return;
  }
  
  // Add vim-selected class to current element
  element.classList.add('vim-selected');
}

function removeAllCursors() {
  // Remove vim-selected class from all pause menu buttons
  document.querySelectorAll('.pause-btn').forEach(btn => {
    btn.classList.remove('vim-selected');
  });
}

function activateCurrentElement() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav) {
    logger.debug("Pause menu: No element to activate");
    return;
  }
  
  logger.debug("Pause menu: Activating element:", currentNav.action);
  
  // Execute the appropriate action based on the button
  switch(currentNav.action) {
    case 'resume':
      resumeGame();
      break;
    case 'restart':
      restartGame();
      break;
    case 'exit':
      exitToMenu();
      break;
    default:
      // Fallback - just click the button
      element.click();
  }
}

// Game control functions
function resumeGame() {
  logger.debug("Pause menu: Resuming game");
  // This will be implemented in the main pause menu system
  if (window.pauseMenuSystem && window.pauseMenuSystem.resumeGame) {
    window.pauseMenuSystem.resumeGame();
  }
}

function restartGame() {
  logger.debug("Pause menu: Restarting game");
  // This will be implemented in the main pause menu system
  if (window.pauseMenuSystem && window.pauseMenuSystem.restartGame) {
    window.pauseMenuSystem.restartGame();
  }
}

function exitToMenu() {
  logger.debug("Pause menu: Exiting to menu");
  // This will be implemented in the main pause menu system
  if (window.pauseMenuSystem && window.pauseMenuSystem.exitToMenu) {
    window.pauseMenuSystem.exitToMenu();
  }
}

// Export functions for external use
export function getCurrentAction() {
  const currentNav = availableElements[currentElementIndex];
  return currentNav ? currentNav.action : null;
}

export function setCurrentIndex(index) {
  if (index >= 0 && index < availableElements.length) {
    currentElementIndex = index;
    updateCursor();
  }
}