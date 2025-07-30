import { isSpaceHighlightActive, setSpaceHighlightActive } from './spaceHighlightState.js';

export function showSpaceHighlight() {
  const keyboardContainer = document.querySelector('.keyboard-map');
  if (!keyboardContainer) {
    logger.debug('Keyboard map container not found');
    return;
  }

  // Find all keys that contain space characters
  const spaceKeys = keyboardContainer.querySelectorAll('.key[data-letter=" "]');
  logger.debug(`Found ${spaceKeys.length} space characters to highlight`);

  spaceKeys.forEach(key => {
    const keyTop = key.querySelector('.key-top');
    if (keyTop) {
      // Add space highlight class to ALL space characters
      keyTop.classList.add('space-highlighted');
      
      // Apply grey highlighting to all space characters
      // The CSS will handle showing different borders/glows based on data-map
      keyTop.style.setProperty('--space-background', 'linear-gradient(145deg, #868e96, #6c757d)');
      keyTop.style.setProperty('--space-border', '#495057');
      keyTop.style.setProperty('--space-shadow', `
        0 6px 0 #343a40,
        0 8px 12px rgba(0, 0, 0, 0.4),
        inset 0 2px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2)
      `);
      
      // Mark this key as having space highlighting
      key.setAttribute('data-space-highlighted', 'true');
    }
  });

  setSpaceHighlightActive(true);
}

export function hideSpaceHighlight() {
  const keyboardContainer = document.querySelector('.keyboard-map');
  if (!keyboardContainer) {
    return;
  }

  // Find all keys with space highlighting
  const highlightedKeys = keyboardContainer.querySelectorAll('[data-space-highlighted="true"]');
  logger.debug(`Removing highlight from ${highlightedKeys.length} space characters`);

  highlightedKeys.forEach(key => {
    const keyTop = key.querySelector('.key-top');
    if (keyTop) {
      // Remove space highlighting
      keyTop.classList.remove('space-highlighted');
      keyTop.style.removeProperty('--space-background');
      keyTop.style.removeProperty('--space-border');
      keyTop.style.removeProperty('--space-shadow');
    }
    
    // Remove space highlighting attribute
    key.removeAttribute('data-space-highlighted');
  });

  setSpaceHighlightActive(false);
}

// Update space highlighting for a specific key when its data-map changes
export function updateSpaceHighlightForKey(key) {
  if (!isSpaceHighlightActive()) return;
  
  const keyTop = key.querySelector('.key-top');
  if (!keyTop || key.getAttribute('data-letter') !== ' ') return;
  
  // Always apply grey highlighting to all space characters
  // The CSS will handle showing different borders/glows based on data-map
  keyTop.style.setProperty('--space-background', 'linear-gradient(145deg, #868e96, #6c757d)');
  keyTop.style.setProperty('--space-border', '#495057');
  keyTop.style.setProperty('--space-shadow', `
    0 6px 0 #343a40,
    0 8px 12px rgba(0, 0, 0, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.3),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2)
  `);
}

export { isSpaceHighlightActive };