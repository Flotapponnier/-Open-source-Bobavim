// Settings modal vim navigation system with delete confirmation support
let currentElementIndex = 0;
let isVimNavigationActive = false;
let isInsertMode = false;
let currentSettingsMode = 'main'; // 'main', 'deleteConfirm'
let availableElements = [];
let keyListenerAdded = false;

// Navigation structures for different settings views
const SETTINGS_NAVIGATION_ELEMENTS = {
  // Main settings modal navigation
  main: [
    { selector: '#closeSettingsModal', column: 0, row: 0, type: 'button' }, // Close button (×)
    { selector: '#resendConfirmationBtn', column: 0, row: 1, type: 'button' }, // Resend confirmation email (if exists)
    { selector: '#currentPassword', column: 0, row: 2, type: 'input' }, // Current password
    { selector: '#newPassword', column: 0, row: 3, type: 'input' }, // New password
    { selector: '#confirmNewPassword', column: 0, row: 4, type: 'input' }, // Confirm new password
    { selector: '#changePasswordForm button[type="submit"]', column: 0, row: 5, type: 'button' }, // Update password
    { selector: '#deleteAccountBtn', column: 0, row: 6, type: 'button' } // Delete account
  ],
  
  // Delete confirmation modal navigation
  deleteConfirm: [
    { selector: '#closeDeleteModal', column: 0, row: 0, type: 'button' }, // Close button (×)
    { selector: '#deleteConfirmation', column: 0, row: 1, type: 'input' }, // Type "boba" here input
    { selector: '#confirmDeleteBtn', column: 0, row: 2, type: 'button' }, // Delete my account
    { selector: '#cancelDeleteBtn', column: 1, row: 2, type: 'button' } // Cancel button
  ]
};

export function initializeSettingsVim(settingsMode = 'main') {
  logger.debug("=== INITIALIZING SETTINGS VIM NAVIGATION ===");
  logger.debug("Settings mode:", settingsMode, "isVimNavigationActive:", isVimNavigationActive, "keyListenerAdded:", keyListenerAdded);
  
  // First ensure we clean up any previous state ALWAYS
  logger.debug("Settings: Force cleaning up any previous state");
  document.removeEventListener('keydown', handleKeyPress, true);
  keyListenerAdded = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Force reset all state
  isVimNavigationActive = false;
  isInsertMode = false;
  currentElementIndex = 0;
  availableElements = [];
  
  const modal = document.getElementById(settingsMode === 'deleteConfirm' ? 'deleteConfirmModal' : 'userSettingsModal');
  if (!modal) {
    logger.warn("No settings modal found for vim navigation");
    return;
  }
  
  // Check modal visibility
  const modalStyle = window.getComputedStyle(modal);
  logger.debug("Settings modal display:", modalStyle.display);
  
  // Set new state
  currentSettingsMode = settingsMode;
  
  // Find all available elements for this settings mode
  updateAvailableElements(settingsMode);
  
  if (availableElements.length === 0) {
    logger.warn("Settings: No available elements found for navigation");
    return;
  }
  
  // Start on first available element
  currentElementIndex = 0;
  isVimNavigationActive = true;
  
  logger.debug(`Settings vim starting at element index: ${currentElementIndex}`);
  logger.debug(`Available elements:`, availableElements);
  
  // Ensure main vim navigation stays disabled during settings modal
  if (window.hideCursor) {
    window.hideCursor();
  }
  if (window.disableVimNavigation) {
    window.disableVimNavigation();
  }
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners (ensure it's not already added)
  if (!keyListenerAdded) {
    // Add with capture phase to intercept before main vim navigation
    document.addEventListener('keydown', handleKeyPress, true);
    keyListenerAdded = true;
    logger.debug("Settings: Event listener added with capture=true");
  } else {
    logger.debug("Settings: Event listener already exists");
  }
  
  // Add targeted click interceptor for close/cancel buttons AND input fields
  document.addEventListener('click', function(e) {
    const isSettingsModalOpen = modal && !modal.classList.contains('hidden');
    if (!isSettingsModalOpen || !isVimNavigationActive) return;
    
    const target = e.target;
    
    // Handle input field clicks - auto-enter insert mode
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Find the element in our navigation structure and enter insert mode
      const elementIndex = availableElements.findIndex(nav => {
        const element = document.querySelector(nav.selector);
        return element === target;
      });
      
      if (elementIndex !== -1) {
        currentElementIndex = elementIndex;
        enterInsertMode();
        logger.debug("Settings: Auto-entered insert mode via click on input");
      }
      return;
    }
    
    // Handle close/cancel button clicks
    const isCloseButton = target.closest(`#${modal.id}`) && (
      (target.classList.contains('close-btn')) ||
      (target.classList.contains('secondary') && target.textContent.toLowerCase().includes('cancel')) ||
      (target.id === 'closeSettingsModal') ||
      (target.id === 'closeDeleteModal') ||
      (target.id === 'cancelDeleteBtn')
    );
    
    if (isCloseButton) {
      logger.debug("Settings: Detected close button click - marking for cleanup");
      // Mark for cleanup on close
      window.settingsModalClosingViaCancel = true;
    }
  }, true);
  
  logger.debug("=== SETTINGS VIM NAVIGATION INITIALIZED ===");
}

export function disableSettingsVim() {
  logger.debug("Settings: Disabling settings vim navigation");
  isVimNavigationActive = false;
  isInsertMode = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Clear any text selection and remove focus from any input
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
  
  // Remove focus from any active element in the settings modal
  const settingsInputs = document.querySelectorAll('#userSettingsModal input, #userSettingsModal textarea, #userSettingsModal button, #deleteConfirmModal input, #deleteConfirmModal textarea, #deleteConfirmModal button');
  settingsInputs.forEach(input => {
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
  
  // Only remove main vim cursors, keep settings modal cursors during normal operation
  document.querySelectorAll('.vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Clear main vim cursor styling but preserve settings modal styling
  document.querySelectorAll('[data-original-text]').forEach(el => {
    const originalText = el.getAttribute('data-original-text');
    if (originalText) {
      el.textContent = originalText;
      el.removeAttribute('data-original-text');
    }
  });
  
  // Always remove the event listener
  document.removeEventListener('keydown', handleKeyPress, true);
  keyListenerAdded = false;
  
  // Reset state completely
  currentElementIndex = 0;
  availableElements = [];
  currentSettingsMode = 'main';
  
  logger.debug("Settings vim navigation disabled and state reset");
}

export function updateSettingsVimForMode(settingsMode) {
  if (isVimNavigationActive) {
    currentSettingsMode = settingsMode;
    updateAvailableElements(settingsMode);
    // Reset to first element when switching modes
    currentElementIndex = 0;
    if (!isInsertMode) {
      updateCursor();
    }
    logger.debug("Settings vim updated for mode:", settingsMode);
  }
}

function updateAvailableElements(settingsMode) {
  availableElements = [];
  
  const elements = SETTINGS_NAVIGATION_ELEMENTS[settingsMode];
  if (!elements) {
    logger.warn("Unknown settings mode:", settingsMode);
    return;
  }
  
  logger.debug(`Settings: Updating elements for mode: ${settingsMode}`);
  
  // Add elements for this settings mode
  elements.forEach(nav => {
    const element = document.querySelector(nav.selector);
    logger.debug(`Settings: Looking for element with selector: ${nav.selector}`, element ? 'FOUND' : 'NOT FOUND');
    
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
      logger.debug(`Settings: Added element ${nav.selector} to navigation`);
    } else if (element) {
      logger.debug(`Settings: Element ${nav.selector} found but not visible`);
    }
  });
  
  logger.debug("Available settings elements:", availableElements.length);
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
    logger.debug(`Settings: Error checking visibility:`, e);
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
  // Check if we're in a settings modal FIRST - if so, intercept ALL vim keys
  const settingsModal = document.getElementById('userSettingsModal');
  const deleteModal = document.getElementById('deleteConfirmModal');
  const isSettingsModalOpen = (settingsModal && !settingsModal.classList.contains('hidden')) ||
                              (deleteModal && !deleteModal.classList.contains('hidden'));
  
  // Check if we're typing in an input field
  const isTypingInInput = (
    event.target.tagName === 'INPUT' || 
    event.target.tagName === 'TEXTAREA' || 
    event.target.isContentEditable
  );
  
  // If settings modal is open and we're NOT in insert mode and NOT typing in input, intercept vim keys
  if (isSettingsModalOpen && !isInsertMode && !isTypingInInput && (
    event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
    event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
    event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape'
  )) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Stop ALL further propagation
    logger.debug("Settings: Intercepted key:", event.key, "preventing main vim activation");
  }
  
  // Debug logging for key presses
  if (event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
      event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
      event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape') {
    logger.debug("Settings: Key pressed:", event.key, "isVimNavigationActive:", isVimNavigationActive);
  }
  
  if (!isVimNavigationActive) {
    logger.debug("Settings: Key ignored - vim navigation not active");
    return;
  }
  
  // Check if we're in a settings modal
  if (!isSettingsModalOpen) {
    logger.debug("Settings: Key ignored - modal not visible");
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
    logger.debug("Settings: Insert mode - letting key pass through:", event.key);
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
      // Note: Don't call hideCursor() here as it hides the settings modal cursor
      // Main vim navigation is already disabled during modal
      if (window.disableVimNavigation) {
        window.disableVimNavigation();
      }
      // Don't close modal - just provide feedback that we're already in normal mode
      logger.debug("Settings: Already in normal mode - escape does not close modal, main vim forcibly disabled");
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
    ensureElementVisible();
    logger.debug(`Settings: Moved up to index ${bestIndex}`);
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
    ensureElementVisible();
    logger.debug(`Settings: Moved down to index ${bestIndex}`);
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
    ensureElementVisible();
    logger.debug(`Settings: Moved left to index ${bestIndex}`);
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
    ensureElementVisible();
    logger.debug(`Settings: Moved right to index ${bestIndex}`);
  }
}

function enterInsertMode() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav || currentNav.type !== 'input') {
    logger.debug("Settings: Cannot enter insert mode - not on input field");
    return;
  }
  
  logger.debug("Settings: Entering insert mode on input field");
  isInsertMode = true;
  
  // Remove vim cursor and focus the input
  removeAllCursors();
  element.focus();
  
  // Add insert mode indicator
  addInsertModeIndicator(element);
}

function exitInsertMode() {
  logger.debug("Settings: Exiting insert mode");
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
  
  // Note: Don't call hideCursor() here as it interferes with settings modal cursor
  // Main vim is already disabled during modal open
  
  // Restore settings modal cursor
  updateCursor();
}

function activateCurrentElement() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav) {
    logger.debug("Settings: No element to activate");
    return;
  }
  
  logger.debug("Settings: Activating element:", currentNav.type, currentNav.selector);
  
  if (currentNav.type === 'input') {
    // For input fields, enter insert mode
    enterInsertMode();
  } else if (currentNav.type === 'button') {
    // Check if this is a close/cancel button
    const isCloseButton = element.textContent.toLowerCase().includes('cancel') || 
                         element.classList.contains('close-btn') ||
                         element.classList.contains('secondary') ||
                         element.id === 'closeSettingsModal' ||
                         element.id === 'closeDeleteModal' ||
                         element.id === 'cancelDeleteBtn';
    
    if (isCloseButton) {
      // Mark for cleanup on close
      window.settingsModalClosingViaCancel = true;
    }
    
    // For buttons, click them
    try {
      element.click();
    } catch (e) {
      logger.debug("Settings: Error clicking element:", e);
    }
  }
}

function updateCursor() {
  logger.debug("Settings: updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Don't show cursor in insert mode
  if (isInsertMode) {
    return;
  }
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Settings: Current element for cursor:", element);
  
  if (!element) {
    logger.debug("Settings: No element found for cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.settings-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons
  document.querySelectorAll('[data-original-settings-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-settings-text');
    el.removeAttribute('data-original-settings-text');
  });
}

function removeInsertModeIndicators() {
  document.querySelectorAll('.settings-insert-indicator').forEach(indicator => {
    indicator.remove();
  });
}

function addInsertModeIndicator(element) {
  if (!element) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'settings-insert-indicator';
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
    // For input fields, use a border highlight
    const cursor = document.createElement('div');
    cursor.className = 'settings-vim-cursor';
    cursor.style.cssText = `
      position: fixed;
      border: 3px solid #ff6b35;
      border-radius: 6px;
      pointer-events: none;
      z-index: 99998;
      animation: settings-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
    element.setAttribute('data-original-settings-text', originalText);
    element.textContent = '🧋 ' + originalText;
  }
  
  // Add CSS animation if not already present
  if (!document.getElementById('settings-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'settings-vim-cursor-styles';
    style.textContent = `
      @keyframes settings-vim-cursor-pulse {
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

// Auto-scroll functionality to ensure element is visible
function ensureElementVisible() {
  const element = getCurrentElement();
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  
  // Check if element is out of view
  const isOutOfView = (
    rect.top < 0 || 
    rect.bottom > windowHeight || 
    rect.left < 0 || 
    rect.right > windowWidth
  );
  
  if (isOutOfView) {
    logger.debug("Settings: Element is out of view, scrolling into view");
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',  // Center the element vertically
      inline: 'center'  // Center the element horizontally
    });
  }
}

// Function to refresh cursor position after animations complete
export function refreshSettingsCursor() {
  if (isVimNavigationActive && !isInsertMode) {
    updateCursor();
  }
}

// Export functions for external use
export function getInsertModeStatus() {
  return isInsertMode;
}

export function getCurrentSettingsMode() {
  return currentSettingsMode;
}