import { CHARACTER_CONFIG } from "./index_constants/characters.js";

const STORAGE_KEY = "boba_vim_selected_character";
let selectedCharacter = loadSelectedCharacterFromStorage();

export function initializeCharacterSelection() {
  logger.debug("Initializing character selection...");

  // Apply saved character selection immediately (no delay)
  applySavedSelectionImmediate();

  // Load player-owned characters and update UI
  loadPlayerCharacters();

  const characterBoxes = document.querySelectorAll(
    CHARACTER_CONFIG.SELECTORS.CHARACTER_BOXES,
  );

  characterBoxes.forEach((box) => {
    box.addEventListener("click", () => {
      const character = box.dataset.character;

      if (box.classList.contains(CHARACTER_CONFIG.CSS_CLASSES.LOCKED)) {
        // Special handling for boba_diamond - check if user is logged in
        if (character === "boba_diamond") {
          fetch('/api/auth/me', { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
              if (data.authenticated) {
                // User is logged in, show payment modal
                import("./paymentModal.js").then((module) => {
                  module.showPaymentModal(character);
                });
              } else {
                // User not logged in, show registration modal
                import("./auth.js").then((module) => {
                  module.showAuthModal("register");
                });
              }
            })
            .catch(error => {
              logger.error('Error checking auth status:', error);
              // Fallback to showing registration modal
              import("./auth.js").then((module) => {
                module.showAuthModal("register");
              });
            });
        } else {
          // For other locked characters, show auth modal
          import("./auth.js").then((module) => {
            module.showAuthModal("register");
          });
        }
        return;
      }

      if (
        box.classList.contains(CHARACTER_CONFIG.CSS_CLASSES.UNLOCKED) ||
        box.classList.contains(CHARACTER_CONFIG.CSS_CLASSES.SELECTED)
      ) {
        selectCharacter(character);
      }
    });
  });
}

function selectCharacter(character) {
  logger.debug("=== CHARACTER SELECTION PROCESS ===");
  logger.debug("Attempting to select character:", character);
  logger.debug("Previous selected character:", selectedCharacter);

  document
    .querySelectorAll(CHARACTER_CONFIG.SELECTORS.CHARACTER_BOXES)
    .forEach((box) => {
      box.classList.remove(CHARACTER_CONFIG.CSS_CLASSES.SELECTED);
    });

  const selectedBox = document.querySelector(`[data-character="${character}"]`);
  if (selectedBox) {
    logger.debug("Found character box for:", character);
    logger.debug("Character box classes:", selectedBox.classList.toString());

    selectedBox.classList.add(CHARACTER_CONFIG.CSS_CLASSES.SELECTED);
    selectedCharacter = character;
    saveSelectedCharacterToStorage(character);

    logger.debug("Character successfully selected:", character);
    logger.debug("Updated selectedCharacter variable:", selectedCharacter);
  } else {
    logger.warn("Character box not found for:", character);
  }
}

export function getSelectedCharacter() {
  return selectedCharacter;
}

export function unlockAllCharacters() {
  // Unlock premium characters for registered users (golden, black)
  // Keep special locked characters (boba_diamond) locked - they require payment, not just registration
  logger.debug('unlockAllCharacters called - keeping boba_diamond locked - v2');
  const premiumBoxes = [
    document.querySelector(CHARACTER_CONFIG.SELECTORS.GOLDEN_BOX),
    document.querySelector(CHARACTER_CONFIG.SELECTORS.BLACK_BOX)
  ].filter(box => box); // Filter out any null boxes
  
  logger.debug('Premium boxes found:', premiumBoxes.length);
  
  premiumBoxes.forEach((box) => {
    box.classList.remove(CHARACTER_CONFIG.CSS_CLASSES.LOCKED);
    box.classList.add(CHARACTER_CONFIG.CSS_CLASSES.UNLOCKED);
    const lockIcon = box.querySelector(CHARACTER_CONFIG.SELECTORS.LOCK_ICON);
    if (lockIcon) {
      lockIcon.remove();
    }
  });

  // Load player-owned characters to update UI with any paid characters
  loadPlayerCharacters();

  // Re-apply saved selection now that characters are unlocked
  reapplySavedSelection();
}

export function lockPremiumCharacters() {
  const goldenBox = document.querySelector(
    CHARACTER_CONFIG.SELECTORS.GOLDEN_BOX,
  );
  const blackBox = document.querySelector(CHARACTER_CONFIG.SELECTORS.BLACK_BOX);

  [goldenBox, blackBox].forEach((box) => {
    if (box) {
      box.classList.remove(
        CHARACTER_CONFIG.CSS_CLASSES.UNLOCKED,
        CHARACTER_CONFIG.CSS_CLASSES.SELECTED,
      );
      box.classList.add(CHARACTER_CONFIG.CSS_CLASSES.LOCKED);
      if (!box.querySelector(CHARACTER_CONFIG.SELECTORS.LOCK_ICON)) {
        const lockIcon = document.createElement("span");
        lockIcon.className = CHARACTER_CONFIG.CSS_CLASSES.LOCK_ICON;
        lockIcon.textContent = CHARACTER_CONFIG.ICONS.LOCK;
        box.appendChild(lockIcon);
      }
    }
  });

  // Reset selection to default if premium character was selected
  if (CHARACTER_CONFIG.PREMIUM.includes(selectedCharacter)) {
    selectCharacter(CHARACTER_CONFIG.DEFAULT);
  }
}

export function lockPaidCharacters() {
  const diamondBox = document.querySelector(CHARACTER_CONFIG.SELECTORS.DIAMOND_BOX);
  
  if (diamondBox) {
    // Lock the character
    diamondBox.classList.remove(
      CHARACTER_CONFIG.CSS_CLASSES.UNLOCKED,
      CHARACTER_CONFIG.CSS_CLASSES.SELECTED,
    );
    diamondBox.classList.add(CHARACTER_CONFIG.CSS_CLASSES.LOCKED);
    
    // Add lock icon back
    if (!diamondBox.querySelector(CHARACTER_CONFIG.SELECTORS.LOCK_ICON)) {
      const lockIcon = document.createElement("span");
      lockIcon.className = CHARACTER_CONFIG.CSS_CLASSES.LOCK_ICON;
      lockIcon.textContent = CHARACTER_CONFIG.ICONS.DIAMOND;
      diamondBox.appendChild(lockIcon);
    }
    
    // Remove level indicator
    const levelIndicator = diamondBox.querySelector('.character-level');
    if (levelIndicator) {
      levelIndicator.remove();
    }
    
    // Reset title
    diamondBox.setAttribute('title', 'Diamond Boba - Coming soon');
  }

  // Reset selection to default if boba_diamond was selected
  if (selectedCharacter === "boba_diamond") {
    selectCharacter(CHARACTER_CONFIG.DEFAULT);
  }
}

// ==================== LocalStorage Functions ====================

function loadSelectedCharacterFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (
      saved &&
      ["boba", "pinky", "golden", "black", "boba_diamond"].includes(saved)
    ) {
      logger.debug(`Loaded saved character: ${saved}`);
      return saved;
    }
  } catch (error) {
    logger.warn("Failed to load character from localStorage:", error);
  }
  return CHARACTER_CONFIG.DEFAULT;
}

function saveSelectedCharacterToStorage(character) {
  try {
    localStorage.setItem(STORAGE_KEY, character);
    logger.debug(`Saved character to localStorage: ${character}`);
  } catch (error) {
    logger.warn("Failed to save character to localStorage:", error);
  }
}

function applySavedSelectionImmediate() {
  const savedCharacter = selectedCharacter;

  // Remove selected class from all boxes (including default)
  document
    .querySelectorAll(CHARACTER_CONFIG.SELECTORS.CHARACTER_BOXES)
    .forEach((box) => {
      box.classList.remove(CHARACTER_CONFIG.CSS_CLASSES.SELECTED);
    });

  // Apply saved selection immediately, regardless of lock state
  const characterBox = document.querySelector(
    `[data-character="${savedCharacter}"]`,
  );
  if (characterBox) {
    characterBox.classList.add(CHARACTER_CONFIG.CSS_CLASSES.SELECTED);
    logger.debug(
      `Applied saved character selection immediately: ${savedCharacter}`,
    );
  } else {
    // Fallback to default if saved character doesn't exist
    const defaultBox = document.querySelector(
      `[data-character="${CHARACTER_CONFIG.DEFAULT}"]`,
    );
    if (defaultBox) {
      defaultBox.classList.add(CHARACTER_CONFIG.CSS_CLASSES.SELECTED);
    }
  }
}

function reapplySavedSelection() {
  // This is called after auth completes - just ensure the right selection is applied
  applySavedSelectionImmediate();
}

// ==================== Coming Soon Message ====================

// This function is no longer needed since all locked characters now show registration modal
// Keeping it for any legacy usage, but it should not be called
function showComingSoonMessage(character) {
  logger.debug(`Coming soon character clicked: ${character}`);
  
  // All locked characters now show registration modal
  import("./auth.js").then((module) => {
    module.showAuthModal("register");
  });
}

// Optional: Toast notification function (more elegant than alert)
function showToastNotification(message) {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  // Add CSS animation if not already present
  if (!document.querySelector("#toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to page
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// ==================== Player Character Loading ====================

async function loadPlayerCharacters() {
  try {
    const response = await fetch('/api/player/characters', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      updateCharacterSelectionUI(data.characters);
    } else if (response.status === 401) {
      // User not logged in, skip character loading
      return;
    } else {
      logger.error('Failed to load player characters:', response.status);
    }
  } catch (error) {
    logger.error('Error loading player characters:', error);
  }
}

function updateCharacterSelectionUI(ownedCharacters) {
  if (!ownedCharacters || ownedCharacters.length === 0) {
    return;
  }

  ownedCharacters.forEach(ownership => {
    const characterBox = document.querySelector(`[data-character="${ownership.character_name}"]`);
    
    if (!characterBox) {
      return;
    }

    // Unlock the character
    characterBox.classList.remove(CHARACTER_CONFIG.CSS_CLASSES.LOCKED);
    characterBox.classList.add(CHARACTER_CONFIG.CSS_CLASSES.UNLOCKED);
    
    // Remove lock icon
    const lockIcon = characterBox.querySelector(CHARACTER_CONFIG.SELECTORS.LOCK_ICON);
    if (lockIcon) {
      lockIcon.remove();
    }
    
    // Add level indicator for paid characters (boba_diamond) regardless of level
    if (ownership.character_name === 'boba_diamond' || ownership.level > 1) {
      let levelIndicator = characterBox.querySelector('.character-level');
      if (!levelIndicator) {
        levelIndicator = document.createElement('div');
        levelIndicator.className = 'character-level';
        characterBox.appendChild(levelIndicator);
      }
      levelIndicator.textContent = `Level ${ownership.level}`;
    }
    
    // Update tooltip/title if exists
    if (ownership.character_name === 'boba_diamond' || ownership.level > 1) {
      const characterName = ownership.character_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      characterBox.setAttribute('title', `${characterName} Level ${ownership.level}`);
    }
  });
}

// Export the loadPlayerCharacters function for use in other modules
export { loadPlayerCharacters };
