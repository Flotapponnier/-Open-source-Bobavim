// Simple and robust vim navigation system
let currentElementIndex = 0;
let isVimNavigationActive = true;
let isInCharacterSelection = false;
let currentCharacterIndex = 0;
let isInSocialIcons = false;
let currentSocialIndex = 0;

// Simple flat navigation structure - no complex nested logic
const NAVIGATION_ELEMENTS = [
  // LEFT COLUMN
  { selector: '#surveyButton', column: 0, row: 0, type: 'button' },
  { selector: '#newsletterButton', column: 0, row: 0, type: 'button' }, // Same row as survey (h/l)
  { selector: '#musicButton', column: 0, row: 1, type: 'button' },
  { selector: '.instructions-book', column: 0, row: 2, type: 'button' },
  
  // MIDDLE COLUMN  
  { selector: '.love-letter-image', column: 1, row: 0, type: 'image' },
  { selector: '#playButton', column: 1, row: 1, type: 'button' }, // START POSITION
  { selector: '.character-grid', column: 1, row: 2, type: 'character-grid' },
  { selector: '#playOnline', column: 1, row: 3, type: 'button' },
  { selector: '#leaderboardButton', column: 1, row: 4, type: 'button' },
  
  // RIGHT COLUMN - handles both logged in and logged out states
  { selector: '#loginButton', column: 2, row: 0, type: 'button' },
  { selector: '#registerButton', column: 2, row: 0, type: 'button' }, // Same row as login (h/l)
  { selector: '#logoutButton', column: 2, row: 0, type: 'button' }, // Same row as login (h/l) - logged in state
  { selector: '#settingsButton', column: 2, row: 0, type: 'button' }, // Same row as login (h/l) - logged in state
  { selector: '.social-icons .linkedin-icon', column: 2, row: 1, type: 'social-icon' },
  { selector: '.social-icons .github-icon', column: 2, row: 1, type: 'social-icon' }, // Same row as linkedin (h/l)
  { selector: '.social-icons .portfolio-icon', column: 2, row: 1, type: 'social-icon' }, // Same row as linkedin (h/l)
  { selector: '.terms-link', column: 2, row: 2, type: 'button' }
];

// Social icons selectors for individual navigation
const SOCIAL_ICON_SELECTORS = [
  '.social-icons .linkedin-icon',
  '.social-icons .github-icon', 
  '.social-icons .portfolio-icon'
];

// Find the Play button index as start position
const PLAY_BUTTON_INDEX = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#playButton');

export function initializeVimNavigation() {
  logger.debug("Initializing simple vim navigation...");
  
  // CRITICAL: Prevent initialization on game pages
  const isGamePage = document.body && document.body.classList.contains('game-page');
  if (isGamePage) {
    logger.debug("Blocked vim navigation initialization - on game page");
    return;
  }
  
  // Set initial position to Play button
  currentElementIndex = PLAY_BUTTON_INDEX >= 0 ? PLAY_BUTTON_INDEX : 5; // Default to Play button
  isInCharacterSelection = false;
  currentCharacterIndex = 0;
  
  logger.debug(`Starting at element index: ${currentElementIndex}`);
  
  // Set initial cursor position
  updateCursor();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  logger.debug("Simple vim navigation initialized");
}

function getCurrentElement() {
  // Handle character selection mode
  if (isInCharacterSelection) {
    const characterBoxes = document.querySelectorAll('.character-grid .character-box');
    const element = characterBoxes[currentCharacterIndex] || null;
    logger.debug('Character selection element:', element);
    return element;
  }
  
  // Handle social icons mode
  if (isInSocialIcons) {
    const socialSelector = SOCIAL_ICON_SELECTORS[currentSocialIndex];
    if (socialSelector) {
      const element = document.querySelector(socialSelector);
      logger.debug('Social icon element:', element, 'selector:', socialSelector, 'index:', currentSocialIndex);
      return element;
    }
  }
  
  // Get current navigation element
  if (currentElementIndex < 0 || currentElementIndex >= NAVIGATION_ELEMENTS.length) {
    logger.debug('Invalid element index:', currentElementIndex);
    return null;
  }
  
  const navElement = NAVIGATION_ELEMENTS[currentElementIndex];
  if (!navElement) {
    logger.debug('No navigation element found at index:', currentElementIndex);
    return null;
  }
  
  // Try to find the actual DOM element
  try {
    const element = document.querySelector(navElement.selector);
    logger.debug(`Current element (${navElement.selector}):`, element);
    return element;
  } catch (e) {
    logger.debug('Error finding element with selector:', navElement.selector, e);
    return null;
  }
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

function moveLeft() {
  if (isInCharacterSelection) {
    // Navigate within character selection
    const characterBoxes = document.querySelectorAll('.character-grid .character-box');
    if (currentCharacterIndex > 0) {
      currentCharacterIndex--;
      updateCursor();
    }
    return;
  }
  
  if (isInSocialIcons) {
    // Navigate within social icons
    logger.debug('Moving left in social icons, current index:', currentSocialIndex);
    if (currentSocialIndex > 0) {
      currentSocialIndex--;
      logger.debug('New social index:', currentSocialIndex);
      updateCursor();
    }
    return;
  }
  
  const currentNav = NAVIGATION_ELEMENTS[currentElementIndex];
  if (!currentNav) return;
  
  // Handle same-row elements (Survey/Newsletter, Login/Register, Social Icons)
  if (currentNav.selector === '#newsletterButton') {
    // Newsletter -> Survey
    const surveyIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#surveyButton');
    if (surveyIndex >= 0) {
      currentElementIndex = surveyIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#registerButton') {
    // Register -> Login  
    const loginIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#loginButton');
    if (loginIndex >= 0) {
      currentElementIndex = loginIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#settingsButton') {
    // Settings -> Logout (logged in state)
    const logoutIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#logoutButton');
    if (logoutIndex >= 0) {
      currentElementIndex = logoutIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '.social-icons .github-icon') {
    // GitHub -> LinkedIn
    const linkedinIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '.social-icons .linkedin-icon');
    if (linkedinIndex >= 0) {
      currentElementIndex = linkedinIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '.social-icons .portfolio-icon') {
    // Portfolio -> GitHub
    const githubIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '.social-icons .github-icon');
    if (githubIndex >= 0) {
      currentElementIndex = githubIndex;
      updateCursor();
      return;
    }
  }
  
  // Find elements in left column, preferring same row
  const targetColumn = currentNav.column - 1;
  const finalTargetColumn = targetColumn < 0 ? 2 : targetColumn; // Wrap to right if needed
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < NAVIGATION_ELEMENTS.length; i++) {
    const nav = NAVIGATION_ELEMENTS[i];
    if (nav.column === finalTargetColumn) {
      const element = document.querySelector(nav.selector);
      if (element && isElementVisible(element)) {
        const rowDiff = Math.abs(nav.row - currentNav.row);
        if (rowDiff < bestRowDiff) {
          bestRowDiff = rowDiff;
          bestIndex = i;
        }
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Moved left to index ${bestIndex}`);
  }
}

function moveRight() {
  if (isInCharacterSelection) {
    // Navigate within character selection
    const characterBoxes = document.querySelectorAll('.character-grid .character-box');
    if (currentCharacterIndex < characterBoxes.length - 1) {
      currentCharacterIndex++;
      updateCursor();
    }
    return;
  }
  
  if (isInSocialIcons) {
    // Navigate within social icons
    logger.debug('Moving right in social icons, current index:', currentSocialIndex, 'max:', SOCIAL_ICON_SELECTORS.length - 1);
    if (currentSocialIndex < SOCIAL_ICON_SELECTORS.length - 1) {
      currentSocialIndex++;
      logger.debug('New social index:', currentSocialIndex);
      updateCursor();
    }
    return;
  }
  
  const currentNav = NAVIGATION_ELEMENTS[currentElementIndex];
  if (!currentNav) return;
  
  // Handle same-row elements (Survey/Newsletter, Login/Register, Social Icons)
  if (currentNav.selector === '#surveyButton') {
    // Survey -> Newsletter
    const newsletterIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#newsletterButton');
    if (newsletterIndex >= 0) {
      currentElementIndex = newsletterIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#loginButton') {
    // Login -> Register
    const registerIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#registerButton');
    if (registerIndex >= 0) {
      currentElementIndex = registerIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '#logoutButton') {
    // Logout -> Settings (logged in state)
    const settingsIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#settingsButton');
    if (settingsIndex >= 0) {
      currentElementIndex = settingsIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '.social-icons .linkedin-icon') {
    // LinkedIn -> GitHub
    const githubIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '.social-icons .github-icon');
    if (githubIndex >= 0) {
      currentElementIndex = githubIndex;
      updateCursor();
      return;
    }
  } else if (currentNav.selector === '.social-icons .github-icon') {
    // GitHub -> Portfolio
    const portfolioIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '.social-icons .portfolio-icon');
    if (portfolioIndex >= 0) {
      currentElementIndex = portfolioIndex;
      updateCursor();
      return;
    }
  }
  
  // Find elements in right column, preferring same row
  const targetColumn = currentNav.column + 1;
  const finalTargetColumn = targetColumn > 2 ? 0 : targetColumn; // Wrap to left if needed
  
  let bestIndex = -1;
  let bestRowDiff = Infinity;
  
  for (let i = 0; i < NAVIGATION_ELEMENTS.length; i++) {
    const nav = NAVIGATION_ELEMENTS[i];
    if (nav.column === finalTargetColumn) {
      const element = document.querySelector(nav.selector);
      if (element && isElementVisible(element)) {
        const rowDiff = Math.abs(nav.row - currentNav.row);
        if (rowDiff < bestRowDiff) {
          bestRowDiff = rowDiff;
          bestIndex = i;
        }
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Moved right to index ${bestIndex}`);
  }
}

function moveUp() {
  if (isInCharacterSelection) {
    // Move up in character grid or exit
    const characterBoxes = document.querySelectorAll('.character-grid .character-box');
    const newIndex = Math.max(0, currentCharacterIndex - 5);
    if (newIndex !== currentCharacterIndex) {
      currentCharacterIndex = newIndex;
      updateCursor();
    } else {
      // Exit character selection to Play button
      isInCharacterSelection = false;
      currentElementIndex = PLAY_BUTTON_INDEX;
      updateCursor();
    }
    return;
  }
  
  if (isInSocialIcons) {
    // Exit social icons and go to Login/Register level
    isInSocialIcons = false;
    const loginIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#loginButton');
    currentElementIndex = loginIndex >= 0 ? loginIndex : currentElementIndex;
    updateCursor();
    return;
  }
  
  const currentNav = NAVIGATION_ELEMENTS[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in same column but higher row (lower row number)
  let bestIndex = -1;
  let bestRow = -1;
  
  for (let i = 0; i < NAVIGATION_ELEMENTS.length; i++) {
    const nav = NAVIGATION_ELEMENTS[i];
    if (nav.column === currentNav.column && nav.row < currentNav.row && nav.row > bestRow) {
      const element = document.querySelector(nav.selector);
      if (element && isElementVisible(element)) {
        bestRow = nav.row;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Moved up to index ${bestIndex}`);
  }
}

function moveDown() {
  if (isInCharacterSelection) {
    // Move down in character grid or exit
    const characterBoxes = document.querySelectorAll('.character-grid .character-box');
    const newIndex = Math.min(characterBoxes.length - 1, currentCharacterIndex + 5);
    if (newIndex !== currentCharacterIndex) {
      currentCharacterIndex = newIndex;
      updateCursor();
    } else {
      // Exit character selection to Play Online button
      isInCharacterSelection = false;
      const playOnlineIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '#playOnline');
      currentElementIndex = playOnlineIndex >= 0 ? playOnlineIndex : currentElementIndex;
      updateCursor();
    }
    return;
  }
  
  if (isInSocialIcons) {
    // Exit social icons and go to T&C
    isInSocialIcons = false;
    const termsIndex = NAVIGATION_ELEMENTS.findIndex(el => el.selector === '.terms-link');
    currentElementIndex = termsIndex >= 0 ? termsIndex : currentElementIndex;
    updateCursor();
    return;
  }
  
  const currentNav = NAVIGATION_ELEMENTS[currentElementIndex];
  if (!currentNav) return;
  
  // Find element in same column but lower row (higher row number)
  let bestIndex = -1;
  let bestRow = Infinity;
  
  for (let i = 0; i < NAVIGATION_ELEMENTS.length; i++) {
    const nav = NAVIGATION_ELEMENTS[i];
    if (nav.column === currentNav.column && nav.row > currentNav.row && nav.row < bestRow) {
      const element = document.querySelector(nav.selector);
      if (element && isElementVisible(element)) {
        bestRow = nav.row;
        bestIndex = i;
      }
    }
  }
  
  if (bestIndex >= 0) {
    currentElementIndex = bestIndex;
    updateCursor();
    logger.debug(`Moved down to index ${bestIndex}`);
  }
}

function handleKeyPress(event) {
  if (!isVimNavigationActive) return;
  
  // CRITICAL: Block all key handling on game pages
  const isGamePage = document.body && document.body.classList.contains('game-page');
  if (isGamePage) {
    return;
  }
  
  // Don't interfere with input fields
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable) {
    return;
  }
  
  switch(event.key.toLowerCase()) {
    case 'h':
      event.preventDefault();
      logger.debug('H pressed, isInSocialIcons:', isInSocialIcons, 'currentSocialIndex:', currentSocialIndex);
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
      logger.debug('L pressed, isInSocialIcons:', isInSocialIcons, 'currentSocialIndex:', currentSocialIndex);
      moveRight();
      break;
    case 'enter':
      event.preventDefault();
      activateCurrentElement();
      break;
    case 'escape':
      event.preventDefault();
      closeActiveModals();
      break;
  }
}

function updateCursor() {
  logger.debug("updateCursor called");
  
  // Remove previous cursor
  removeAllCursors();
  
  // Get current element
  const element = getCurrentElement();
  logger.debug("Current element for cursor:", element);
  
  if (!element) {
    logger.debug("No element found for cursor");
    return;
  }
  
  // Add cursor inside element
  addCursorInsideElement(element);
  
  // Scroll element into view if needed
  element.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'nearest',
    inline: 'nearest'
  });
}

function removeAllCursors() {
  // Remove all existing cursor elements and restore original positioning
  document.querySelectorAll('.vim-cursor').forEach(cursor => {
    const parent = cursor.parentElement;
    
    // Restore original positioning if stored
    const originalPosition = cursor.getAttribute('data-original-position');
    const originalTop = cursor.getAttribute('data-original-top');
    const originalLeft = cursor.getAttribute('data-original-left');
    const originalTransform = cursor.getAttribute('data-original-transform');
    
    if (parent && originalPosition !== null) {
      parent.style.position = originalPosition === 'static' ? '' : originalPosition;
      parent.style.top = originalTop || '';
      parent.style.left = originalLeft || '';
      parent.style.transform = originalTransform || '';
    }
    
    cursor.remove();
  });
  
  // Restore original text content for buttons
  document.querySelectorAll('[data-original-text]').forEach(el => {
    el.textContent = el.getAttribute('data-original-text');
    el.removeAttribute('data-original-text');
  });
}

function addCursorInsideElement(element) {
  if (!element) return;
  
  if (element.classList.contains('character-box')) {
    // For character boxes, add cursor as highly visible overlay in center
    const cursor = document.createElement('div');
    cursor.className = 'vim-cursor';
    cursor.textContent = '🧋';
    cursor.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      z-index: 10000;
      pointer-events: none;
      animation: vim-cursor-pulse 1s ease-in-out infinite alternate;
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.8));
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Make character box relatively positioned if not already
    if (element.style.position !== 'relative') {
      element.style.position = 'relative';
    }
    element.appendChild(cursor);
    
  } else if (element.classList.contains('character-grid')) {
    // For character-grid container, enter character selection mode
    isInCharacterSelection = true;
    currentCharacterIndex = 0;
    updateCursor(); // Recursive call to show cursor on first character
    return;
    
  } else if (element.tagName === 'BUTTON' && element.id !== 'surveyButton' && element.id !== 'newsletterButton' && !element.classList.contains('terms-link')) {
    // For buttons (except survey/newsletter/terms), prepend boba emoji (don't replace first letter)
    const originalText = element.textContent;
    element.setAttribute('data-original-text', originalText);
    element.textContent = '🧋 ' + originalText;
    
  } else if (element.tagName === 'IMG' || element.classList.contains('love-letter-image') || 
             element.id === 'surveyButton' || element.id === 'newsletterButton' || element.classList.contains('terms-link')) {
    // For images and survey/newsletter buttons, use fixed positioning like credentials to avoid interference
    const cursor = document.createElement('div');
    cursor.className = 'vim-cursor';
    cursor.textContent = '🧋';
    cursor.style.cssText = `
      position: fixed;
      font-size: 20px;
      z-index: 99999;
      pointer-events: none;
      animation: vim-cursor-pulse 1s ease-in-out infinite alternate;
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
    
    // Add cursor to body instead of element to avoid any interference
    document.body.appendChild(cursor);
    
  } else {
    // For other elements (survey, newsletter, music, etc.), add cursor as fixed positioned overlay
    const cursor = document.createElement('div');
    cursor.className = 'vim-cursor';
    cursor.textContent = '🧋';
    cursor.style.cssText = `
      position: fixed;
      font-size: 18px;
      z-index: 99999;
      pointer-events: none;
      animation: vim-cursor-pulse 1s ease-in-out infinite alternate;
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.8));
      background: rgba(255, 165, 0, 0.9);
      border: 2px solid white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(255, 165, 0, 0.6);
    `;
    
    // Position cursor relative to element's position on screen
    const rect = element.getBoundingClientRect();
    cursor.style.top = (rect.top - 15) + 'px';
    cursor.style.left = (rect.left - 15) + 'px';
    
    // Add cursor to body instead of element to avoid any interference
    document.body.appendChild(cursor);
  }
  
  // Add CSS animation if not already present
  if (!document.getElementById('vim-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'vim-cursor-styles';
    style.textContent = `
      @keyframes vim-cursor-pulse {
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
  logger.debug("Activating element:", element);
  
  if (!element) {
    logger.debug("No element to activate");
    return;
  }
  
  logger.debug("Element details:", {
    tagName: element.tagName,
    className: element.className,
    id: element.id,
    classList: Array.from(element.classList || [])
  });
  
  // Special handling for character grid
  if (element.classList.contains('character-grid') && !isInCharacterSelection) {
    logger.debug("Entering character selection mode");
    isInCharacterSelection = true;
    currentCharacterIndex = 0;
    updateCursor();
    return;
  }
  
  // Handle different element types
  logger.debug("Attempting to click element");
  try {
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      logger.debug("Clicking button/link");
      element.click();
    } else if (element.classList.contains('character-box')) {
      logger.debug("Clicking character box");
      element.click();
    } else if (element.classList.contains('love-letter-image')) {
      logger.debug("Clicking love letter image");
      element.click();
    } else if (element.tagName === 'IMG') {
      logger.debug("Clicking image");
      element.click();
    } else if (element.classList.contains('social-icons') && !isInSocialIcons) {
      // Enter social icons mode
      logger.debug("Entering social icons mode");
      isInSocialIcons = true;
      currentSocialIndex = 0;
      updateCursor();
      return;
    } else if (isInSocialIcons) {
      // Click the current social icon
      logger.debug("Clicking social icon");
      element.click();
    } else {
      logger.debug("Generic click attempt");
      element.click();
    }
  } catch (e) {
    logger.debug("Error clicking element:", e);
  }
}

function closeActiveModals() {
  // Close any open modals
  const modals = document.querySelectorAll('.modal:not(.hidden)');
  modals.forEach(modal => {
    modal.classList.add('hidden');
  });
  
  // Close love letter modal specifically
  if (window.closeLoveLetterModal) {
    window.closeLoveLetterModal();
  }
  
  // Exit character selection mode
  if (isInCharacterSelection) {
    isInCharacterSelection = false;
    updateCursor();
  }
  
  // Exit social icons mode
  if (isInSocialIcons) {
    isInSocialIcons = false;
    updateCursor();
  }
}

// Export functions for external use
export function enableVimNavigation() {
  // Prevent enabling vim navigation on game pages
  const isGamePage = document.body && document.body.classList.contains('game-page');
  if (isGamePage) {
    console.warn('Blocked enableVimNavigation - on game page');
    return;
  }
  
  logger.debug('Main vim navigation enabled, isVimNavigationActive:', true);
  isVimNavigationActive = true;
  updateCursor();
}

export function disableVimNavigation() {
  logger.debug('Main vim navigation disabled');
  isVimNavigationActive = false;
  removeAllCursors();
  
  // Force clear any lingering visual state
  document.querySelectorAll('.vim-cursor, .auth-vim-cursor, .modal-vim-cursor').forEach(cursor => {
    cursor.remove();
  });
}

export function refreshNavigableElements() {
  updateCursor();
}

// Function to disable cursor when modals are open
export function hideCursor() {
  removeAllCursors();
}

// Function to show cursor when modals are closed
export function showCursor() {
  // Prevent showing cursor on game pages
  const isGamePage = document.body && document.body.classList.contains('game-page');
  if (isGamePage) {
    console.warn('Blocked showCursor - on game page');
    return;
  }
  
  logger.debug('Main vim showCursor called, isVimNavigationActive:', isVimNavigationActive);
  if (isVimNavigationActive) {
    updateCursor();
  }
}