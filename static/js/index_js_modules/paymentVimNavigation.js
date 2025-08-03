// Payment modal vim navigation system with auto-scroll and Stripe card navigation
let currentElementIndex = 0;
let isVimNavigationActive = false;
let isInsertMode = false;
let availableElements = [];
let keyListenerAdded = false;

// Navigation structure for payment modal - following the desired flow
const PAYMENT_NAVIGATION_ELEMENTS = [
  // Header section
  { selector: '.close-payment-modal', column: 0, row: 0, type: 'button' }, // Close button (×) - START HERE
  
  // Payment amount section
  { selector: '#payment-amount', column: 0, row: 1, type: 'input' }, // Support amount input
  
  // Optional message section
  { selector: '#support-message', column: 0, row: 2, type: 'textarea' }, // Optional message textarea
  
  // Card details section (Stripe Elements) - these need special handling
  { selector: '#card-element', column: 0, row: 3, type: 'stripe-card' }, // Card details (simulated)
  
  // Submit button
  { selector: '#submit-payment', column: 0, row: 4, type: 'button' } // Secure pay button
];

// Stripe card sub-navigation (h/l for card details)
const STRIPE_CARD_ELEMENTS = [
  'card-number', 'card-expiry', 'card-cvc' // Virtual navigation within Stripe card element
];
let currentStripeElementIndex = 0;
let isInStripeNavigation = false;

export function initializePaymentVim() {
  logger.debug("=== INITIALIZING PAYMENT VIM NAVIGATION ===");
  logger.debug("isVimNavigationActive:", isVimNavigationActive, "keyListenerAdded:", keyListenerAdded);
  
  // First ensure we clean up any previous state ALWAYS
  logger.debug("Payment: Force cleaning up any previous state");
  document.removeEventListener('keydown', handleKeyPress, true);
  keyListenerAdded = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Force reset all state
  isVimNavigationActive = false;
  isInsertMode = false;
  isInStripeNavigation = false;
  currentElementIndex = 0;
  currentStripeElementIndex = 0;
  availableElements = [];
  
  const modal = document.getElementById('payment-modal');
  if (!modal) {
    logger.warn("No payment modal found for vim navigation");
    return;
  }
  
  // Check modal visibility
  const modalStyle = window.getComputedStyle(modal);
  logger.debug("Payment modal display:", modalStyle.display);
  
  // Find all available elements
  updateAvailableElements();
  
  if (availableElements.length === 0) {
    logger.warn("Payment: No available elements found for navigation");
    return;
  }
  
  // Start on close button (×) as requested
  currentElementIndex = 0;
  isVimNavigationActive = true;
  
  logger.debug(`Payment vim starting at element index: ${currentElementIndex}`);
  logger.debug(`Available elements:`, availableElements);
  
  // Ensure main vim navigation stays disabled during payment modal
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
    logger.debug("Payment: Event listener added with capture=true");
  } else {
    logger.debug("Payment: Event listener already exists");
  }
  
  // Add targeted click interceptor for close buttons AND input fields
  document.addEventListener('click', function(e) {
    const isPaymentModalOpen = modal && !modal.classList.contains('hidden');
    if (!isPaymentModalOpen || !isVimNavigationActive) return;
    
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
        logger.debug("Payment: Auto-entered insert mode via click on input");
      }
      return;
    }
    
    // Handle close button clicks
    const isCloseButton = target.closest('#payment-modal') && (
      (target.classList.contains('close-payment-modal')) ||
      (target.textContent && target.textContent.includes('×'))
    );
    
    if (isCloseButton) {
      logger.debug("Payment: Detected close button click - marking for cleanup");
      // Mark for cleanup on close
      window.paymentModalClosingViaCancel = true;
    }
  }, true);
  
  logger.debug("=== PAYMENT VIM NAVIGATION INITIALIZED ===");
}

export function disablePaymentVim() {
  logger.debug("Payment: Disabling payment vim navigation");
  isVimNavigationActive = false;
  isInsertMode = false;
  isInStripeNavigation = false;
  removeAllCursors();
  removeInsertModeIndicators();
  
  // Clear any text selection and remove focus from any input
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
  
  // Remove focus from any active element in the payment modal
  const paymentInputs = document.querySelectorAll('#payment-modal input, #payment-modal textarea, #payment-modal button');
  paymentInputs.forEach(input => {
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
  
  // Only remove main vim cursors, keep payment modal cursors during normal operation
  document.querySelectorAll('.vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Clear main vim cursor styling but preserve payment modal styling
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
  currentStripeElementIndex = 0;
  availableElements = [];
  
  logger.debug("Payment vim navigation disabled and state reset");
}

function updateAvailableElements() {
  availableElements = [];
  
  logger.debug(`Payment: Updating elements for payment modal`);
  
  // Add elements for payment modal
  PAYMENT_NAVIGATION_ELEMENTS.forEach(nav => {
    const element = document.querySelector(nav.selector);
    logger.debug(`Payment: Looking for element with selector: ${nav.selector}`, element ? 'FOUND' : 'NOT FOUND');
    
    if (element && isElementVisible(element)) {
      availableElements.push(nav);
      logger.debug(`Payment: Added element ${nav.selector} to navigation`);
    } else if (element) {
      logger.debug(`Payment: Element ${nav.selector} found but not visible`);
    }
  });
  
  logger.debug("Available payment elements:", availableElements.length);
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
    logger.debug(`Payment: Error checking visibility:`, e);
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
  // Check if we're in the payment modal FIRST - if so, intercept ALL vim keys
  const paymentModal = document.getElementById('payment-modal');
  const isPaymentModalOpen = paymentModal && !paymentModal.classList.contains('hidden');
  
  // Check if we're typing in an input field
  const isTypingInInput = (
    event.target.tagName === 'INPUT' || 
    event.target.tagName === 'TEXTAREA' || 
    event.target.isContentEditable
  );
  
  // If payment modal is open and we're NOT in insert mode and NOT typing in input, intercept vim keys
  if (isPaymentModalOpen && !isInsertMode && !isTypingInInput && (
    event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
    event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
    event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape'
  )) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Stop ALL further propagation
    logger.debug("Payment: Intercepted key:", event.key, "preventing main vim activation");
  }
  
  // Debug logging for key presses
  if (event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'j' || 
      event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'l' || 
      event.key.toLowerCase() === 'i' || event.key === 'Enter' || event.key === 'Escape') {
    logger.debug("Payment: Key pressed:", event.key, "isVimNavigationActive:", isVimNavigationActive);
  }
  
  if (!isVimNavigationActive) {
    logger.debug("Payment: Key ignored - vim navigation not active");
    return;
  }
  
  // Check if we're in the payment modal
  if (!isPaymentModalOpen) {
    logger.debug("Payment: Key ignored - modal not visible");
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
    logger.debug("Payment: Insert mode - letting key pass through:", event.key);
    return;
  }
  
  // Handle Stripe card navigation (h/l within card element)
  if (isInStripeNavigation) {
    switch(event.key.toLowerCase()) {
      case 'h':
        event.preventDefault();
        event.stopPropagation();
        moveStripeLeft();
        return;
      case 'l':
        event.preventDefault();
        event.stopPropagation();
        moveStripeRight();
        return;
      case 'j':
      case 'k':
        event.preventDefault();
        event.stopPropagation();
        // Exit Stripe navigation and move to main navigation
        exitStripeNavigation();
        break;
      case 'enter':
        event.preventDefault();
        event.stopPropagation();
        // Focus on the Stripe element (simulate click)
        focusStripeElement();
        return;
      case 'escape':
        event.preventDefault();
        event.stopPropagation();
        exitStripeNavigation();
        return;
    }
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
      // Note: Don't call hideCursor() here as it hides the payment modal cursor
      // Main vim navigation is already disabled during modal
      if (window.disableVimNavigation) {
        window.disableVimNavigation();
      }
      // Don't close modal - just provide feedback that we're already in normal mode
      logger.debug("Payment: Already in normal mode - escape does not close modal, main vim forcibly disabled");
      break;
  }
}

function moveUp() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Exit Stripe navigation if active
  if (isInStripeNavigation) {
    exitStripeNavigation();
    return;
  }
  
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
    logger.debug(`Payment: Moved up to index ${bestIndex}`);
  }
}

function moveDown() {
  if (availableElements.length <= 1) return;
  
  const currentNav = availableElements[currentElementIndex];
  if (!currentNav) return;
  
  // Exit Stripe navigation if active
  if (isInStripeNavigation) {
    exitStripeNavigation();
    return;
  }
  
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
    logger.debug(`Payment: Moved down to index ${bestIndex}`);
  }
}

function moveLeft() {
  // If we're on the Stripe card element, enter Stripe navigation
  const currentNav = availableElements[currentElementIndex];
  if (currentNav && currentNav.type === 'stripe-card') {
    enterStripeNavigation();
    return;
  }
  
  // Otherwise, no left movement in payment modal (single column)
  logger.debug("Payment: Left movement not available in single column layout");
}

function moveRight() {
  // If we're on the Stripe card element, enter Stripe navigation
  const currentNav = availableElements[currentElementIndex];
  if (currentNav && currentNav.type === 'stripe-card') {
    enterStripeNavigation();
    return;
  }
  
  // Otherwise, no right movement in payment modal (single column)
  logger.debug("Payment: Right movement not available in single column layout");
}

function enterStripeNavigation() {
  logger.debug("Payment: Entering Stripe card navigation");
  isInStripeNavigation = true;
  currentStripeElementIndex = 0; // Start with card number
  updateCursor(); // This will show the Stripe-specific cursor
}

function exitStripeNavigation() {
  logger.debug("Payment: Exiting Stripe card navigation");
  isInStripeNavigation = false;
  currentStripeElementIndex = 0;
  updateCursor(); // Return to normal cursor
}

function moveStripeLeft() {
  if (currentStripeElementIndex > 0) {
    currentStripeElementIndex--;
    updateCursor();
    logger.debug(`Payment: Moved to Stripe element ${STRIPE_CARD_ELEMENTS[currentStripeElementIndex]}`);
  }
}

function moveStripeRight() {
  if (currentStripeElementIndex < STRIPE_CARD_ELEMENTS.length - 1) {
    currentStripeElementIndex++;
    updateCursor();
    logger.debug(`Payment: Moved to Stripe element ${STRIPE_CARD_ELEMENTS[currentStripeElementIndex]}`);
  }
}

function focusStripeElement() {
  // Since Stripe Elements are in an iframe, we can't directly focus them
  // Instead, we'll click on the card element to focus it
  const cardElement = document.querySelector('#card-element');
  if (cardElement) {
    cardElement.click();
    logger.debug("Payment: Focused Stripe card element");
  }
}

function enterInsertMode() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav || (currentNav.type !== 'input' && currentNav.type !== 'textarea')) {
    logger.debug("Payment: Cannot enter insert mode - not on input field");
    return;
  }
  
  logger.debug("Payment: Entering insert mode on input field");
  isInsertMode = true;
  
  // Remove vim cursor and focus the input
  removeAllCursors();
  element.focus();
  
  // Add insert mode indicator
  addInsertModeIndicator(element);
}

function exitInsertMode() {
  logger.debug("Payment: Exiting insert mode");
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
  
  // Note: Don't call hideCursor() here as it interferes with payment modal cursor
  // Main vim is already disabled during modal open
  
  // Restore payment modal cursor
  updateCursor();
}

function activateCurrentElement() {
  const element = getCurrentElement();
  const currentNav = availableElements[currentElementIndex];
  
  if (!element || !currentNav) {
    logger.debug("Payment: No element to activate");
    return;
  }
  
  logger.debug("Payment: Activating element:", currentNav.type, currentNav.selector);
  
  if (currentNav.type === 'input' || currentNav.type === 'textarea') {
    // For input fields, enter insert mode
    enterInsertMode();
  } else if (currentNav.type === 'stripe-card') {
    // For Stripe card element, enter Stripe navigation
    enterStripeNavigation();
  } else if (currentNav.type === 'button') {
    // Check if this is a close button
    const isCloseButton = element.classList.contains('close-payment-modal') ||
                         element.textContent.includes('×');
    
    if (isCloseButton) {
      // Mark for cleanup on close
      window.paymentModalClosingViaCancel = true;
    }
    
    // For buttons, click them
    try {
      element.click();
    } catch (e) {
      logger.debug("Payment: Error clicking element:", e);
    }
  }
}

function updateCursor() {
  logger.debug("Payment: updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Don't show cursor in insert mode
  if (isInsertMode) {
    return;
  }
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Payment: Current element for cursor:", element);
  
  if (!element) {
    logger.debug("Payment: No element found for cursor");
    return;
  }
  
  // Add cursor to element
  addCursorToElement(element);
}

function removeAllCursors() {
  // Remove all existing cursor elements
  document.querySelectorAll('.payment-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
  
  // Restore original text content for buttons
  document.querySelectorAll('[data-original-payment-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-payment-text');
    el.removeAttribute('data-original-payment-text');
  });
}

function removeInsertModeIndicators() {
  document.querySelectorAll('.payment-insert-indicator').forEach(indicator => {
    indicator.remove();
  });
}

function addInsertModeIndicator(element) {
  if (!element) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'payment-insert-indicator';
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
  
  if (currentNav.type === 'input' || currentNav.type === 'textarea') {
    // For input fields, use a border highlight
    const cursor = document.createElement('div');
    cursor.className = 'payment-vim-cursor';
    cursor.style.cssText = `
      position: fixed;
      border: 3px solid #ff6b35;
      border-radius: 6px;
      pointer-events: none;
      z-index: 99998;
      animation: payment-vim-cursor-pulse 1s ease-in-out infinite alternate;
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
    
  } else if (currentNav.type === 'stripe-card') {
    // For Stripe card element, show which sub-element is selected
    const cursor = document.createElement('div');
    cursor.className = 'payment-vim-cursor';
    
    if (isInStripeNavigation) {
      // Show specific Stripe field cursor
      const currentStripeField = STRIPE_CARD_ELEMENTS[currentStripeElementIndex];
      cursor.textContent = `🧋 ${currentStripeField.replace('-', ' ').toUpperCase()}`;
      cursor.style.cssText = `
        position: fixed;
        background: rgba(255, 215, 0, 0.95);
        color: black;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 99999;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        border: 2px solid #FFD700;
        animation: payment-vim-cursor-pulse 1s ease-in-out infinite alternate;
      `;
    } else {
      // Show general card element cursor
      cursor.style.cssText = `
        position: fixed;
        border: 3px solid #9b59b6;
        border-radius: 6px;
        pointer-events: none;
        z-index: 99998;
        animation: payment-vim-cursor-pulse 1s ease-in-out infinite alternate;
        box-shadow: 0 0 12px rgba(155, 89, 182, 0.8);
        background: rgba(155, 89, 182, 0.1);
      `;
    }
    
    // Position cursor relative to Stripe card element
    const rect = element.getBoundingClientRect();
    if (isInStripeNavigation) {
      // Position the text indicator above the card element
      cursor.style.top = (rect.top - 35) + 'px';
      cursor.style.left = rect.left + 'px';
    } else {
      // Position border around card element
      const padding = 4;
      cursor.style.top = (rect.top - padding) + 'px';
      cursor.style.left = (rect.left - padding) + 'px';
      cursor.style.width = (rect.width + (padding * 2)) + 'px';
      cursor.style.height = (rect.height + (padding * 2)) + 'px';
    }
    
    document.body.appendChild(cursor);
    
  } else if (currentNav.type === 'button') {
    // For buttons, prepend boba emoji
    const originalText = element.textContent;
    element.setAttribute('data-original-payment-text', originalText);
    element.textContent = '🧋 ' + originalText;
  }
  
  // Add CSS animation if not already present
  if (!document.getElementById('payment-vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'payment-vim-cursor-styles';
    style.textContent = `
      @keyframes payment-vim-cursor-pulse {
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
    logger.debug("Payment: Element is out of view, scrolling into view");
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',  // Center the element vertically
      inline: 'center'  // Center the element horizontally
    });
  }
}

// Function to refresh cursor position after animations complete
export function refreshPaymentCursor() {
  if (isVimNavigationActive && !isInsertMode) {
    updateCursor();
  }
}

// Export functions for external use
export function getInsertModeStatus() {
  return isInsertMode;
}

export function getStripeNavigationStatus() {
  return isInStripeNavigation;
}