// Sprite visibility state management
let spritesHidden = false;

export function areSpritesHidden() {
  return spritesHidden;
}

export function setSpritesHidden(hidden) {
  spritesHidden = hidden;
}

export function toggleSpriteVisibility() {
  const allGameElements = document.querySelectorAll('.boba-character, .pearl, .enemy');
  
  if (!spritesHidden) {
    // Hide all boba, pearl, and enemy sprites on the current screen
    allGameElements.forEach(element => {
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.3s ease';
    });
    spritesHidden = true;
    return 'Sprites Hidden';
  } else {
    // Show all boba, pearl, and enemy sprites again
    allGameElements.forEach(element => {
      element.style.opacity = '1';
      element.style.transition = 'opacity 0.3s ease';
    });
    spritesHidden = false;
    return 'Sprites Visible';
  }
}

export function applyVisibilityToElement(element) {
  // Apply visibility immediately without transition for newly created elements
  if (spritesHidden) {
    element.style.opacity = '0';
    element.style.transition = 'none';
    // Force immediate application
    element.offsetHeight; 
    element.style.transition = 'opacity 0.3s ease';
  } else {
    element.style.opacity = '1';
    element.style.transition = 'opacity 0.3s ease';
  }
}

// Additional functions for user preferences
export function hideSprites() {
  if (!spritesHidden) {
    toggleSpriteVisibility();
  }
}

export function showSprites() {
  if (spritesHidden) {
    toggleSpriteVisibility();
  }
}