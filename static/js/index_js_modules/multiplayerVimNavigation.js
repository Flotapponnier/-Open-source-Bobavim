// Vim navigation system for multiplayer modals
let currentElementIndex = 0;
let isVimNavigationActive = false;
let currentModal = null;
let availableElements = [];

// Navigation structure for multiplayer modals
const MULTIPLAYER_NAVIGATION_ELEMENTS = {
  // Guest registration modal
  guest: [
    { selector: '#registerNowBtn', column: 0, row: 0, type: 'button' },
    { selector: '#closeRegistrationModal', column: 1, row: 0, type: 'button' }
  ],
  
  // Match found modal
  match: [
    { selector: '#acceptMatch', column: 0, row: 0, type: 'button' },
    { selector: '#rejectMatch', column: 1, row: 0, type: 'button' }
  ]
};

export function initializeMultiplayerVim(modalType) {
  console.log("Initializing multiplayer vim navigation for:", modalType);
  
  const modal = getModalElement(modalType);
  if (!modal) {
    console.warn("No modal found for multiplayer vim navigation");
    return;
  }
  
  currentModal = modalType;
  
  // Find all available elements in the modal
  updateAvailableElements(modalType);
  
  // Set initial position to Close button (right button - as requested)
  currentElementIndex = findCloseButtonIndex();
  isVimNavigationActive = true;
  
  console.log(`Multiplayer vim starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  // Set up observer to detect when buttons disappear (for match modal)
  if (modalType === 'match') {
    setupButtonVisibilityObserver();
  }
  
  console.log("Multiplayer vim navigation initialized");
}

function setupButtonVisibilityObserver() {
  // Observe changes to the match actions container
  const matchActions = document.getElementById('matchActions');
  if (matchActions) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.style.display === 'none' && isVimNavigationActive) {
            console.log("Match actions hidden, disabling vim navigation");
            hideMultiplayerVimImmediately();
          }
        }
      });
    });
    
    observer.observe(matchActions, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    // Clean up observer when navigation is disabled
    const originalDisable = disableMultiplayerVim;
    window.multiplayerObserver = observer;
  }
}

export function disableMultiplayerVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress);
  currentModal = null;
  
  // Clean up observer if it exists
  if (window.multiplayerObserver) {
    window.multiplayerObserver.disconnect();
    window.multiplayerObserver = null;
  }
  
  console.log("Multiplayer vim navigation disabled");
}

export function hideMultiplayerVimImmediately() {
  // Immediately hide cursor without full cleanup for when buttons disappear
  removeAllCursors();
  isVimNavigationActive = false;
  console.log("Multiplayer vim cursor hidden immediately");
}

function getModalElement(modalType) {
  switch (modalType) {
    case 'guest':
      return document.getElementById('registrationModal');
    case 'match':
      return document.getElementById('matchFoundModal');
    default:
      return null;
  }
}

function updateAvailableElements(modalType) {
  availableElements = [];
  
  if (!MULTIPLAYER_NAVIGATION_ELEMENTS[modalType]) {
    console.warn("Unknown modal type:", modalType);
    return;
  }
  
  // Add elements for this modal type
  MULTIPLAYER_NAVIGATION_ELEMENTS[modalType].forEach(nav => {
    const element = document.querySelector(nav.selector);
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
    }
  });
  
  console.log("Available multiplayer elements:", availableElements.length);
}

function findCloseButtonIndex() {
  // Find the close/right button as starting position
  for (let i = 0; i < availableElements.length; i++) {
    const element = availableElements[i];
    // Close button is always the rightmost (column 1)
    if (element.column === 1) {
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
  
  // Only handle keys if we're in a multiplayer modal
  const modal = getModalElement(currentModal);
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
      moveLeft();
      break;
    case 'j': 
      event.preventDefault();
      // j/k don't move in multiplayer modals - only h/l
      break;
    case 'k':
      event.preventDefault(); 
      // j/k don't move in multiplayer modals - only h/l
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
      // Close modal - click the close button
      clickCloseButton();
      break;
  }
}

function moveLeft() {
  // Find the left button (column 0)
  for (let i = 0; i < availableElements.length; i++) {
    if (availableElements[i].column === 0) {
      currentElementIndex = i;
      updateCursor();
      return;
    }
  }
}

function moveRight() {
  // Find the right button (column 1)
  for (let i = 0; i < availableElements.length; i++) {
    if (availableElements[i].column === 1) {
      currentElementIndex = i;
      updateCursor();
      return;
    }
  }
}

function clickCloseButton() {
  // Find and click the close button (right button)
  const closeButton = availableElements.find(el => el.column === 1);
  if (closeButton) {
    const element = document.querySelector(closeButton.selector);
    if (element) {
      element.click();
    }
  }
}

function updateCursor() {
  console.log("Multiplayer updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Check if any elements are still visible
  const visibleElements = availableElements.filter(nav => {
    const element = document.querySelector(nav.selector);
    return element && isElementVisible(element);
  });
  
  if (visibleElements.length === 0) {
    // No visible elements, hide vim navigation
    console.log("No visible elements, hiding multiplayer vim");
    hideMultiplayerVimImmediately();
    return;
  }
  
  // Get current element
  const element = getCurrentElement();
  console.log("Multiplayer current element for cursor:", element);
  
  if (!element) {
    console.log("No element found for multiplayer cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.multiplayer-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons (remove boba emojis)
  document.querySelectorAll('[data-original-multiplayer-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-multiplayer-text');
    el.removeAttribute('data-original-multiplayer-text');
  });
}

function addCursorToElement(element) {
  if (!element) return;
  
  // For multiplayer modal buttons, use fixed positioning cursor (no text modification)
  const cursor = document.createElement('div');
  cursor.className = 'multiplayer-vim-cursor';
  cursor.textContent = '🧋';
  cursor.style.cssText = `
    position: fixed;
    font-size: 20px;
    z-index: 99999;
    pointer-events: none;
    animation: multiplayer-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
  if (!document.getElementById('multiplayer-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'multiplayer-vim-cursor-styles';
    style.textContent = `
      @keyframes multiplayer-vim-cursor-pulse {
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
  console.log("Multiplayer activating element:", element);
  
  if (!element) {
    console.log("No element to activate in multiplayer");
    return;
  }
  
  try {
    element.click();
  } catch (e) {
    console.log("Error clicking multiplayer element:", e);
  }
}

// Export functions for modal management
export function hideMultiplayerCursor() {
  removeAllCursors();
}

export function showMultiplayerCursor() {
  if (isVimNavigationActive && currentModal) {
    updateAvailableElements(currentModal);
    updateCursor();
  }
}