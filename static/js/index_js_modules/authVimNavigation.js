// Advanced Vim navigation system for auth modal with insert mode support
let currentElementIndex = 0;
let isVimNavigationActive = false;
let isInsertMode = false;
let currentAuthMode = 'login'; // 'login', 'register', 'forgotPassword'
let availableElements = [];
let keyListenerAdded = false; // Track if event listener is already added
let mainVimDisableInterval = null; // Interval to keep main vim disabled

// Navigation structures for different auth forms
const AUTH_NAVIGATION_ELEMENTS = {
  // Login form navigation
  login: [
    { selector: '#login-username', column: 0, row: 0, type: 'input' },
    { selector: '#login-password', column: 0, row: 1, type: 'input' },
    { selector: '#loginForm button[type="submit"]', column: 0, row: 2, type: 'button' },
    { selector: '#loginForm .modal-btn.secondary', column: 1, row: 2, type: 'button' }, // Cancel button
    { selector: '#switchToRegister', column: 0, row: 3, type: 'link' },
    { selector: '#switchToForgotPassword', column: 0, row: 4, type: 'link' }
  ],
  
  // Register form navigation
  register: [
    { selector: '#reg-username', column: 0, row: 0, type: 'input' },
    { selector: '#reg-email', column: 0, row: 1, type: 'input' },
    { selector: '#reg-password', column: 0, row: 2, type: 'input' },
    { selector: '#registrationForm button[type="submit"]', column: 0, row: 3, type: 'button' },
    { selector: '#registrationForm .modal-btn.secondary', column: 1, row: 3, type: 'button' }, // Cancel button
    { selector: '#switchToLogin', column: 0, row: 4, type: 'link' }
  ],
  
  // Forgot password form navigation
  forgotPassword: [
    { selector: '#forgot-email', column: 0, row: 0, type: 'input' },
    { selector: '#forgotPasswordForm button[type="submit"]', column: 0, row: 1, type: 'button' },
    { selector: '#forgotPasswordForm .modal-btn.secondary', column: 1, row: 1, type: 'button' }, // Cancel button
    { selector: '#switchToLoginFromForgot', column: 0, row: 2, type: 'link' }
  ]
};

export function initializeAuthVim(authMode = 'login') {
  logger.debug("=== INITIALIZING AUTH VIM NAVIGATION ===");
  logger.debug("Auth mode:", authMode, "isVimNavigationActive:", isVimNavigationActive, "keyListenerAdded:", keyListenerAdded);
  
  // First ensure we clean up any previous state ALWAYS
  logger.debug("Auth: Force cleaning up any previous state");
  document.removeEventListener('keydown', handleKeyPress, true);
  keyListenerAdded = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Clear any existing interval
  if (mainVimDisableInterval) {
    clearInterval(mainVimDisableInterval);
    mainVimDisableInterval = null;
    logger.debug("Auth: Cleared previous main vim disable interval");
  }
  
  // Force reset all state
  isVimNavigationActive = false;
  isInsertMode = false;
  currentElementIndex = 0;
  availableElements = [];
  
  const modal = document.getElementById('authModal');
  if (!modal) {
    logger.warn("No auth modal found for vim navigation");
    return;
  }
  
  // Check modal visibility
  const modalStyle = window.getComputedStyle(modal);
  logger.debug("Auth modal display:", modalStyle.display);
  
  // Set new state
  currentAuthMode = authMode;
  
  // Find all available elements for this auth mode
  updateAvailableElements(authMode);
  
  if (availableElements.length === 0) {
    logger.warn("Auth: No available elements found for navigation");
    return;
  }
  
  // Start on first available element
  currentElementIndex = 0;
  isVimNavigationActive = true;
  
  logger.debug(`Auth vim starting at element index: ${currentElementIndex}`);
  logger.debug(`Available elements:`, availableElements);
  
  // Ensure main vim navigation stays disabled during auth modal
  if (window.hideCursor) {
    window.hideCursor();
  }
  if (window.disableVimNavigation) {
    window.disableVimNavigation();
  }
  
  // Disable main vim navigation once (no continuous interval needed)
  if (mainVimDisableInterval) {
    clearInterval(mainVimDisableInterval);
    mainVimDisableInterval = null;
  }
  // Just disable once, don't keep calling hideCursor() repeatedly
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners (ensure it's not already added)
  if (!keyListenerAdded) {
    // Add with capture phase to intercept before main vim navigation
    document.addEventListener('keydown', handleKeyPress, true);
    keyListenerAdded = true;
    logger.debug("Auth: Event listener added with capture=true");
  } else {
    logger.debug("Auth: Event listener already exists");
  }
  
  // Add targeted click interceptor ONLY for cancel buttons
  document.addEventListener('click', function(e) {
    const isAuthModalOpen = modal && !modal.classList.contains('hidden');
    if (!isAuthModalOpen) return;
    
    const target = e.target;
    // Only target actual cancel buttons, not all secondary buttons
    const isCancelButton = target.closest('#authModal') && (
      (target.classList.contains('secondary') && target.textContent.toLowerCase().includes('cancel')) ||
      (target.onclick && target.onclick.toString().includes('closeAuthModal'))
    );
    
    if (isCancelButton) {
      logger.debug("Auth: Detected cancel button click - marking for cleanup");
      // Only mark for cleanup, don't do aggressive cleanup here
      window.authModalClosingViaCancel = true;
    }
  }, true);
  
  logger.debug("=== AUTH VIM NAVIGATION INITIALIZED ===");
}

export function disableAuthVim() {
  logger.debug("Auth: Disabling auth vim navigation");
  isVimNavigationActive = false;
  isInsertMode = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Clear the interval that was disabling main vim
  if (mainVimDisableInterval) {
    clearInterval(mainVimDisableInterval);
    mainVimDisableInterval = null;
    logger.debug("Auth: Cleared main vim disable interval");
  }
  
  // Clear any text selection and remove focus from any input
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
  
  // Remove focus from any active element in the auth modal
  const authInputs = document.querySelectorAll('#authModal input, #authModal textarea, #authModal button');
  authInputs.forEach(input => {
    if (input.blur) {
      input.blur();
    }
    // Clear text selection within inputs
    if (input.setSelectionRange) {
      try {
        input.setSelectionRange(0, 0);
      } catch (e) {
        // Ignore errors for non-text inputs
      }
    }
    // Remove any visual highlighting
    if (input.style) {
      input.style.outline = '';
      input.style.boxShadow = '';
      input.style.border = '';
    }
  });
  
  // Remove focus from any active element
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  
  // Clear any outline styles that might persist
  const focusedElements = document.querySelectorAll('#authModal *:focus');
  focusedElements.forEach(el => {
    el.blur();
    el.style.outline = 'none';
  });
  
  // Clear any selection highlighting and focus styles on the page
  const allInputs = document.querySelectorAll('input, textarea, button, [contenteditable]');
  allInputs.forEach(el => {
    if (el.style) {
      el.style.outline = '';
      el.style.boxShadow = '';
    }
  });
  
  // Only remove main vim cursors, keep auth modal cursors during normal operation
  document.querySelectorAll('.vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Clear main vim cursor styling but preserve auth modal styling
  document.querySelectorAll('[data-original-text]').forEach(el => {
    const originalText = el.getAttribute('data-original-text');
    if (originalText) {
      el.textContent = originalText;
      el.removeAttribute('data-original-text');
    }
  });
  
  // Always remove the event listener, even if it was added multiple times
  document.removeEventListener('keydown', handleKeyPress, true);
  keyListenerAdded = false;
  
  // Reset state completely
  currentElementIndex = 0;
  availableElements = [];
  currentAuthMode = 'login';
  
  logger.debug("Auth vim navigation disabled and state reset");
}

export function updateAuthVimForMode(authMode) {
  if (isVimNavigationActive) {
    currentAuthMode = authMode;
    updateAvailableElements(authMode);
    // Reset to first element when switching modes
    currentElementIndex = 0;
    if (!isInsertMode) {
      updateCursor();
    }
    logger.debug("Auth vim updated for mode:", authMode);
  }
}

function updateAvailableElements(authMode) {
  availableElements = [];
  
  const elements = AUTH_NAVIGATION_ELEMENTS[authMode];
  if (!elements) {
    logger.warn("Unknown auth mode:", authMode);
    return;
  }
  
  logger.debug(`Auth: Updating elements for mode: ${authMode}`);
  
  // Add elements for this auth mode
  elements.forEach(nav => {
    const element = document.querySelector(nav.selector);
    logger.debug(`Auth: Looking for element with selector: ${nav.selector}`, element ? 'FOUND' : 'NOT FOUND');
    
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
      logger.debug(`Auth: Added element ${nav.selector} to navigation`);
    } else if (element) {
      logger.debug(`Auth: Element ${nav.selector} found but not visible`);
    }
  });
  
  logger.debug("Available auth elements:", availableElements.length);
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
    logger.debug(`Auth: Error checking visibility:`, e);
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
  // Check if we're in the auth modal FIRST - if so, intercept ALL vim keys
  const modal = document.getElementById('authModal');
  const isAuthModalOpen = modal && !modal.classList.contains('hidden');
  
  // Check if we're typing in an input field
  const isTypingInInput = (
    event.target.tagName === 'INPUT' || 
    event.target.tagName === 'TEXTAREA' || 
    event.target.isContentEditable
  );
  
  // If auth modal is open and we're NOT in insert mode and NOT typing in input, intercept vim keys
  if (isAuthModalOpen && !isInsertMode && !isTypingInInput && (
    event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
    event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
    event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape'
  )) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Stop ALL further propagation
    logger.debug("Auth: Intercepted key:", event.key, "preventing main vim activation");
  }
  
  // Debug logging for key presses
  if (event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
      event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
      event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape') {
    logger.debug("Auth: Key pressed:", event.key, "isVimNavigationActive:", isVimNavigationActive);
  }
  
  if (!isVimNavigationActive) {
    logger.debug("Auth: Key ignored - vim navigation not active");
    return;
  }
  
  // Check if we're in the auth modal
  if (!isAuthModalOpen) {
    logger.debug("Auth: Key ignored - modal not visible");
    return;
  }
  
  // In insert mode, only handle escape key
  if (isInsertMode) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation(); // Prevent bubbling to main vim navigation
      exitInsertMode();
      return;
    }
    // In insert mode, let ALL other keys pass through to the input field naturally
    logger.debug("Auth: Insert mode - letting key pass through:", event.key);
    return;
  }
  
  // In normal navigation mode, handle vim keys
  switch(event.key.toLowerCase()) {
    case 'h':
      event.preventDefault();
      event.stopPropagation(); // Prevent main vim navigation activation
      moveLeft();
      break;
    case 'j': 
      event.preventDefault();
      event.stopPropagation();
      moveDown();
      break;
    case 'k':
      event.preventDefault(); 
      event.stopPropagation();
      moveUp();
      break;
    case 'l':
      event.preventDefault();
      event.stopPropagation();
      moveRight();
      break;
    case 'i':
      event.preventDefault();
      event.stopPropagation();
      enterInsertMode();
      break;
    case 'enter':
      event.preventDefault();
      event.stopPropagation();
      activateCurrentElement();
      break;
    case 'escape':
      event.preventDefault();
      event.stopPropagation();
      // Note: Don't call hideCursor() here as it hides the auth modal cursor
      // Main vim navigation is already disabled during modal
      if (window.disableVimNavigation) {
        window.disableVimNavigation();
      }
      // Don't close modal - just provide feedback that we're already in normal mode
      logger.debug("Auth: Already in normal mode - escape does not close modal, main vim forcibly disabled");
      break;
  }
}

function moveUp() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in same column but higher row (lower row number)
  let bestIndex = -1;
  let bestRow = -1;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === currentNav.column && nav.row < currentNav.row && nav.row > bestRow) {
      bestRow = nav.row;
      bestIndex = i;
    }
  }
  
  // If no element above, wrap to bottom of same column
  if (bestIndex === -1) {
    let maxRow = -1;
    for (let i = 0; i < availableElements.length; i++) {
      const nav = availableElements[i];
      if (nav.column === currentNav.column && nav.row > maxRow) {
        maxRow = nav.row;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Auth: Moved up to index ${bestIndex}`);
  }
}

function moveDown() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in same column but lower row (higher row number)
  let bestIndex = -1;
  let bestRow = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.column === currentNav.column && nav.row > currentNav.row && nav.row < bestRow) {
      bestRow = nav.row;
      bestIndex = i;
    }
  }
  
  // If no element below, wrap to top of same column
  if (bestIndex === -1) {
    let minRow = Infinity;
    for (let i = 0; i < availableElements.length; i++) {
      const nav = availableElements[i];
      if (nav.column === currentNav.column && nav.row < minRow) {
        minRow = nav.row;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Auth: Moved down to index ${bestIndex}`);
  }
}

function moveLeft() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in left column (lower column number) same row
  let bestIndex = -1;
  let bestColumn = -1;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.row === currentNav.row && nav.column < currentNav.column && nav.column > bestColumn) {
      bestColumn = nav.column;
      bestIndex = i;
    }
  }
  
  // If no element to the left, wrap to rightmost in same row
  if (bestIndex === -1) {
    let maxColumn = -1;
    for (let i = 0; i < availableElements.length; i++) {
      const nav = availableElements[i];
      if (nav.row === currentNav.row && nav.column > maxColumn) {
        maxColumn = nav.column;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0 && bestIndex !== currentElementIndex) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Auth: Moved left to index ${bestIndex}`);
  }
}

function moveRight() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in right column (higher column number) same row
  let bestIndex = -1;
  let bestColumn = Infinity;
  
  for (let i = 0; i < availableElements.length; i++) {
    const nav = availableElements[i];
    if (nav.row === currentNav.row && nav.column > currentNav.column && nav.column < bestColumn) {
      bestColumn = nav.column;
      bestIndex = i;
    }
  }
  
  // If no element to the right, wrap to leftmost in same row
  if (bestIndex === -1) {
    let minColumn = Infinity;
    for (let i = 0; i < availableElements.length; i++) {
      const nav = availableElements[i];
      if (nav.row === currentNav.row && nav.column < minColumn) {
        minColumn = nav.column;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0 && bestIndex !== currentElementIndex) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Auth: Moved right to index ${bestIndex}`);
  }
}

function enterInsertMode() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav || currentNav.type !== 'input') {
    logger.debug("Auth: Cannot enter insert mode - not on input field");
    return;
  }
  
  logger.debug("Auth: Entering insert mode on input field");
  isInsertMode = true;
  
  // Remove vim cursor and focus the input
  removeAllCursors();
  element.focus();
  
  // Add insert mode indicator
  addInsertModeIndicator(element);
}

function exitInsertMode() {
  logger.debug("Auth: Exiting insert mode");
  isInsertMode = false;
  
  // Remove insert mode indicators
  removeInsertModeIndicators();
  
  // Blur current input, clear any text selection, and restore vim cursor
  const element = getCurrentElement();
  if (element) {
    element.blur();
    // Clear any text selection
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    // Remove focus styling
    element.style.outline = 'none';
  }
  
  // Note: Don't call hideCursor() here as it interferes with auth modal cursor
  // Main vim is already disabled during modal open
  
  // Restore auth modal cursor
  updateCursor();
}

function activateCurrentElement() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav) {
    logger.debug("Auth: No element to activate");
    return;
  }
  
  logger.debug("Auth: Activating element:", currentNav.type, currentNav.selector);
  
  if (currentNav.type === 'input') {
    // For input fields, enter insert mode
    enterInsertMode();
  } else if (currentNav.type === 'button' || currentNav.type === 'link') {
    // Check if this is a close/cancel button
    const isCloseButton = element.textContent.toLowerCase().includes('cancel') || 
                         element.classList.contains('secondary') ||
                         element.onclick && element.onclick.toString().includes('closeAuthModal');
    
    if (isCloseButton) {
      // Mark for cleanup on close
      window.authModalClosingViaCancel = true;
    }
    
    // For buttons and links, click them
    try {
      element.click();
    } catch (e) {
      logger.debug("Auth: Error clicking element:", e);
    }
  }
}

function updateCursor() {
  logger.debug("Auth: updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Don't show cursor in insert mode
  if (isInsertMode) {
    return;
  }
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Auth: Current element for cursor:", element);
  
  if (!element) {
    logger.debug("Auth: No element found for cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.auth-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons
  document.querySelectorAll('[data-original-auth-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-auth-text');
    el.removeAttribute('data-original-auth-text');
  });
}

function removeInsertModeIndicators() {
  document.querySelectorAll('.auth-insert-indicator').forEach(indicator => {
    indicator.remove();
  });
}

function addInsertModeIndicator(element) {
  if (!element) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'auth-insert-indicator';
  indicator.textContent = 'INSERT';
  
  // Position indicator near the input field
  const rect = element.getBoundingClientRect();
  indicator.style.cssText = `
    position: fixed;
    top: ${rect.top - 30}px;
    left: ${rect.left}px;
    background: rgba(0, 255, 0, 0.95);
    color: black;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    z-index: 99999;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 200, 0, 1);
  `;
  
  document.body.appendChild(indicator);
}

function addCursorToElement(element) {
  if (!element) return;
  
  const currentNav = availableElements[currentElementIndex];
  
  if (currentNav.type === 'input') {
    // For input fields, use a border highlight with better positioning
    const cursor = document.createElement('div');
    cursor.className = 'auth-vim-cursor';
    cursor.style.cssText = `
      position: fixed;
      border: 3px solid #ff6b35;
      border-radius: 6px;
      pointer-events: none;
      z-index: 99998;
      animation: auth-vim-cursor-pulse 1s ease-in-out infinite alternate;
      box-shadow: 0 0 12px rgba(255, 107, 53, 0.8);
      background: rgba(255, 107, 53, 0.1);
    `;
    
    // Position border around input field with proper alignment
    const rect = element.getBoundingClientRect();
    const padding = 4;
    cursor.style.top = (rect.top - padding) + 'px';
    cursor.style.left = (rect.left - padding) + 'px';
    cursor.style.width = (rect.width + (padding * 2)) + 'px';
    cursor.style.height = (rect.height + (padding * 2)) + 'px';
    
    document.body.appendChild(cursor);
    
  } else if (currentNav.type === 'button') {
    // For buttons, prepend boba emoji
    const originalText = element.textContent;
    element.setAttribute('data-original-auth-text', originalText);
    element.textContent = '🧋 ' + originalText;
    
  } else if (currentNav.type === 'link') {
    // For links, use fixed positioning cursor with better alignment
    const cursor = document.createElement('div');
    cursor.className = 'auth-vim-cursor';
    cursor.textContent = '🧋';
    cursor.style.cssText = `
      position: fixed;
      font-size: 14px;
      z-index: 99999;
      pointer-events: none;
      animation: auth-vim-cursor-pulse 1s ease-in-out infinite alternate;
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, 1)) drop-shadow(0 0 3px rgba(0, 0, 0, 0.8));
      background: rgba(255, 165, 0, 0.95);
      border: 2px solid white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 8px rgba(255, 165, 0, 0.7);
    `;
    
    // Position cursor better aligned with link text
    const rect = element.getBoundingClientRect();
    cursor.style.top = (rect.top + (rect.height / 2) - 11) + 'px'; // Center vertically
    cursor.style.left = (rect.left - 25) + 'px'; // Position to the left of text
    
    document.body.appendChild(cursor);
  }
  
  // Add CSS animation if not already present
  if (!document.getElementById('auth-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-vim-cursor-styles';
    style.textContent = `
      @keyframes auth-vim-cursor-pulse {
        0% { 
          opacity: 0.7; 
        }
        100% { 
          opacity: 1; 
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function closeAuthModal() {
  // Use the global close function if available
  if (window.closeAuthModal) {
    window.closeAuthModal();
  } else {
    // Fallback - hide modal directly
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

// Function to clear all selections immediately (before modal close)
function clearAllSelectionsImmediately() {
  logger.debug("Auth: Clearing all selections IMMEDIATELY before close");
  
  // Clear global selections
  if (window.getSelection) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.empty && selection.empty();
  }
  
  if (document.selection) {
    document.selection.empty();
  }
  
  // Clear text selection in ALL inputs on the page
  const allInputs = document.querySelectorAll('input, textarea');
  allInputs.forEach(input => {
    try {
      input.blur();
      if (input.setSelectionRange) {
        input.setSelectionRange(0, 0);
      }
      input.style.outline = '';
      input.style.boxShadow = '';
    } catch (e) {
      // Ignore errors
    }
  });
  
  // Force focus to body
  document.body.focus();
  
  // Additional force clear after tiny delay
  setTimeout(() => {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }, 1);
}

// Function to refresh cursor position after animations complete
export function refreshAuthCursor() {
  if (isVimNavigationActive && !isInsertMode) {
    updateCursor();
  }
}

// Export functions for external use
export function getInsertModeStatus() {
  return isInsertMode;
}

export function getCurrentAuthMode() {
  return currentAuthMode;
}