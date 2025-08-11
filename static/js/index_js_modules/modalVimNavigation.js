// Vim navigation system for index modals (T&C, Love Letter, Manual)
let currentElementIndex = 0;
let isVimNavigationActive = false;
let currentModal = null;
let availableElements = [];
let currentManualPage = 'page-1';

// Navigation structures for different modals
const MODAL_NAVIGATION_ELEMENTS = {
  // Terms modal - X button and nothing else (starts on X)
  terms: [
    { selector: '#termsModal .close-button', column: 0, row: 0, type: 'close' }
  ],
  
  // FAQ modal - X button and nothing else (starts on X)
  faq: [
    { selector: '#faqModal .close-button', column: 0, row: 0, type: 'close' }
  ],
  
  // Love letter modal - X and Close buttons (j/k navigation)
  loveLetter: [
    { selector: '.letter-header .close-btn.retro-btn', column: 0, row: 0, type: 'close' }, // X button (start here)
    { selector: '.letter-footer .close-btn.secondary', column: 0, row: 1, type: 'button' } // Close button
  ],
  
  // Manual modal - depends on current page
  manual: {
    'page-1': [
      { selector: '#closeManual', column: 0, row: 0, type: 'close' }, // X button (start here)
      { selector: '#showKeymapBtn', column: 0, row: 1, type: 'button' }
    ],
    'page-2': [
      { selector: '#closeManual', column: 0, row: 0, type: 'close' }, // X button (start here)
      { selector: '#showMotionsBtn', column: 0, row: 1, type: 'button' }
    ],
    'page-3': [
      { selector: '#closeManual', column: 0, row: 0, type: 'close' }, // X button (start here)
      { selector: '#toScoreAttributionBtn', column: 0, row: 1, type: 'button' }
    ],
    'page-4': [
      { selector: '#closeManual', column: 0, row: 0, type: 'close' }, // X button (start here)
      { selector: '#backToCommandsBtn', column: 0, row: 1, type: 'button' },
      { selector: '#backToConfigBtn', column: 0, row: 2, type: 'button' }
    ]
  }
};

export function initializeModalVim(modalType, page = null) {
  logger.debug("=== INITIALIZING MODAL VIM ==="); // Force debugging
  logger.debug("Modal type:", modalType, page ? `page: ${page}` : '');
  
  const modal = getModalElement(modalType);
  logger.debug("Modal element:", modal);
  if (!modal) {
    logger.warn("No modal found for modal vim navigation");
    return;
  }
  
  // Check modal visibility
  const modalStyle = window.getComputedStyle(modal);
  logger.debug("Modal display:", modalStyle.display);
  logger.debug("Modal visibility:", modalStyle.visibility);
  
  // Special debugging for T&C modal
  if (modalType === 'terms') {
    logger.debug("=== T&C MODAL SPECIAL DEBUG ===");
    const closeButton = document.querySelector('.close-button');
    const closeButtonInModal = modal.querySelector('.close-button');
    logger.debug("Global .close-button search:", closeButton);
    logger.debug("Modal .close-button search:", closeButtonInModal);
    logger.debug("Modal innerHTML preview:", modal.innerHTML.substring(0, 500));
  }
  
  // Special debugging for FAQ modal
  if (modalType === 'faq') {
    logger.debug("=== FAQ MODAL SPECIAL DEBUG ===");
    const closeButton = document.querySelector('.close-button');
    const closeButtonInModal = modal.querySelector('.close-button');
    logger.debug("Global .close-button search:", closeButton);
    logger.debug("Modal .close-button search:", closeButtonInModal);
    logger.debug("Modal innerHTML preview:", modal.innerHTML.substring(0, 500));
  }
  
  currentModal = modalType;
  if (page) {
    currentManualPage = page;
  }
  
  // Find all available elements in the modal
  updateAvailableElements(modalType, page);
  
  // Set initial position to close button (X) - as requested
  currentElementIndex = findCloseButtonIndex();
  isVimNavigationActive = true;
  
  logger.debug(`Modal vim starting at element index: ${currentElementIndex}`);
  logger.debug(`Available elements:`, availableElements);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  logger.debug("=== MODAL VIM NAVIGATION INITIALIZED ===");
}

export function disableModalVim() {
  isVimNavigationActive = false;
  removeAllCursors();
  document.removeEventListener('keydown', handleKeyPress);
  currentModal = null;
  logger.debug("Modal vim navigation disabled");
}

export function updateModalVimForPage(page) {
  if (currentModal === 'manual' && isVimNavigationActive) {
    currentManualPage = page;
    updateAvailableElements('manual', page);
    // Always start on close button when changing pages
    currentElementIndex = findCloseButtonIndex();
    // Delay cursor update to account for page transition animations
    setTimeout(() => {
      updateCursor();
    }, 250);
    logger.debug("Modal vim updated for page:", page);
  }
}

function getModalElement(modalType) {
  switch (modalType) {
    case 'terms':
      return document.getElementById('termsModal');
    case 'faq':
      return document.getElementById('faqModal');
    case 'loveLetter':
      return document.getElementById('loveLetterModal');
    case 'manual':
      return document.getElementById('vimManualModal');
    default:
      return null;
  }
}

function updateAvailableElements(modalType, page = null) {
  availableElements = [];
  
  let elements;
  if (modalType === 'manual' && page) {
    elements = MODAL_NAVIGATION_ELEMENTS.manual[page] || MODAL_NAVIGATION_ELEMENTS.manual['page-1'];
  } else {
    elements = MODAL_NAVIGATION_ELEMENTS[modalType];
  }
  
  if (!elements) {
    logger.warn("Unknown modal type:", modalType);
    return;
  }
  
  // Get the modal container for context-aware search
  const modal = getModalElement(modalType);
  logger.debug("Modal container for search:", modal);
  
  // Add elements for this modal type
  elements.forEach(nav => {
    logger.debug(`Modal: Processing navigation element with selector: ${nav.selector}`);
    
    // Try both global search and modal-scoped search
    let element = document.querySelector(nav.selector);
    if (!element && modal) {
      element = modal.querySelector(nav.selector);
      logger.debug(`Modal: Trying modal-scoped search for ${nav.selector}:`, element ? 'FOUND' : 'NOT FOUND');
    }
    
    logger.debug(`Modal: Looking for element with selector: ${nav.selector}`, element ? 'FOUND' : 'NOT FOUND');
    if (element) {
      logger.debug(`Modal: Element found:`, element);
      logger.debug(`Modal: Element classes:`, element.className);
      logger.debug(`Modal: Element content:`, element.textContent);
      logger.debug(`Modal: Element onclick:`, element.onclick);
      logger.debug(`Modal: Element parent:`, element.parentElement);
    } else {
      logger.debug(`Modal: Element NOT FOUND with selector: ${nav.selector}`);
      // Try alternative selectors for debugging  
      if (modalType === 'terms') {
        const allButtons = document.querySelectorAll('button');
        logger.debug(`T&C: All buttons in document:`, Array.from(allButtons).map(btn => ({
          className: btn.className,
          content: btn.textContent,
          onclick: btn.onclick ? 'has onclick' : 'no onclick',
          id: btn.id
        })));
        
        const allCloseClasses = document.querySelectorAll('[class*="close"]');
        logger.debug(`T&C: All elements with 'close' in class:`, Array.from(allCloseClasses).map(el => ({
          tagName: el.tagName,
          className: el.className,
          content: el.textContent,
          id: el.id
        })));
      }
      
      if (modalType === 'faq') {
        const allButtons = document.querySelectorAll('button');
        logger.debug(`FAQ: All buttons in document:`, Array.from(allButtons).map(btn => ({
          className: btn.className,
          content: btn.textContent,
          onclick: btn.onclick ? 'has onclick' : 'no onclick',
          id: btn.id
        })));
        
        const allCloseClasses = document.querySelectorAll('[class*="close"]');
        logger.debug(`FAQ: All elements with 'close' in class:`, Array.from(allCloseClasses).map(el => ({
          tagName: el.tagName,
          className: el.className,
          content: el.textContent,
          id: el.id
        })));
      }
    }
    
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
      logger.debug(`Modal: Added element ${nav.selector} to navigation`);
    } else if (element) {
      logger.debug(`Modal: Element ${nav.selector} found but not visible`);
    } else {
      logger.debug(`Modal: Element ${nav.selector} not found at all`);
    }
  });
  
  logger.debug("Available modal elements:", availableElements.length);
}

function findCloseButtonIndex() {
  // Find the close button (X) as starting position
  for (let i = 0; i < availableElements.length; i++) {
    const element = availableElements[i];
    if (element.type === 'close') {
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
    const isVisible = style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0 &&
           !element.hasAttribute('disabled') &&
           !element.classList.contains('hidden');
    
    logger.debug(`Modal: Visibility check for ${element.className}:`, {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: rect.width,
      height: rect.height,
      disabled: element.hasAttribute('disabled'),
      hiddenClass: element.classList.contains('hidden'),
      result: isVisible
    });
    
    return isVisible;
  } catch (e) {
    logger.debug(`Modal: Error checking visibility:`, e);
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
  
  // Only handle keys if we're in the current modal
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
      // h/l don't move in modals except manual navigation logic
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
      // h/l don't move in modals except manual navigation logic
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

function moveUp() {
  if (availableElements.length <= 1) return;
  
  // Move to previous element (up in the list)
  currentElementIndex = currentElementIndex > 0 ? currentElementIndex - 1 : availableElements.length - 1;
  updateCursor();
  ensureElementVisible();
}

function moveDown() {
  if (availableElements.length <= 1) return;
  
  // Move to next element (down in the list)
  currentElementIndex = currentElementIndex < availableElements.length - 1 ? currentElementIndex + 1 : 0;
  updateCursor();
  ensureElementVisible();
}

function clickCloseButton() {
  // Find and click the close button (X)
  const closeButton = availableElements.find(el => el.type === 'close');
  if (closeButton) {
    const element = document.querySelector(closeButton.selector);
    if (element) {
      element.click();
    }
  }
}

function updateCursor() {
  logger.debug("Modal updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Modal current element for cursor:", element);
  
  if (!element) {
    logger.debug("No element found for modal cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.modal-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons (remove boba emojis)
  document.querySelectorAll('[data-original-modal-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-modal-text');
    el.removeAttribute('data-original-modal-text');
  });
}

function addCursorToElement(element) {
  if (!element) return;
  
  // For modal buttons, use fixed positioning cursor (no text modification)
  const cursor = document.createElement('div');
  cursor.className = 'modal-vim-cursor';
  cursor.textContent = '🧋';
  cursor.style.cssText = `
    position: fixed;
    font-size: 20px;
    z-index: 99999;
    pointer-events: none;
    animation: modal-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
  
  // Better positioning for different button types
  let topOffset = -10;
  let leftOffset = -10;
  
  // Special positioning for manual close button and other small buttons
  if (element.id === 'closeManual' || element.classList.contains('retro-close-btn')) {
    topOffset = -5; // Less offset for better centering on small buttons
    leftOffset = -5;
  }
  
  cursor.style.top = (rect.top + topOffset) + 'px';
  cursor.style.left = (rect.left + leftOffset) + 'px';
  
  // Add cursor to body
  document.body.appendChild(cursor);
  
  // Add CSS animation if not already present
  if (!document.getElementById('modal-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-vim-cursor-styles';
    style.textContent = `
      @keyframes modal-vim-cursor-pulse {
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
  logger.debug("Modal activating element:", element);
  
  if (!element) {
    logger.debug("No element to activate in modal");
    return;
  }
  
  try {
    element.click();
  } catch (e) {
    logger.debug("Error clicking modal element:", e);
  }
}

// Export functions for modal management
export function hideModalCursor() {
  removeAllCursors();
}

export function showModalCursor() {
  if (isVimNavigationActive && currentModal) {
    updateAvailableElements(currentModal, currentModal === 'manual' ? currentManualPage : null);
    updateCursor();
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
    logger.debug("Modal: Element is out of view, scrolling into view");
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',  // Center the element vertically
      inline: 'center'  // Center the element horizontally
    });
  }
}

// Function to refresh cursor position after animations complete
export function refreshCursorPosition() {
  if (isVimNavigationActive && currentModal) {
    updateCursor();
  }
}