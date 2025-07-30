// ================================
// GAME BANNER SYSTEM
// ================================

export function showGameBanner(message, bannerType = 'normal', duration = 3000, isKeyInstruction = false) {
  const headerInfo = document.querySelector(window.UI_SELECTORS.HEADER_INFO);
  if (!headerInfo) return;

  // Store original content if not already stored
  if (!headerInfo.dataset.originalContent) {
    headerInfo.dataset.originalContent = headerInfo.innerHTML;
  }

  // Clear existing banner classes but keep header-info class
  headerInfo.className = 'header-info';
  headerInfo.style.cssText = '';

  // Add key-instruction class for key press messages
  if (isKeyInstruction) {
    headerInfo.classList.add('key-instruction');
  }

  // Add appropriate banner class based on type
  switch (bannerType) {
    case 'blocked':
      headerInfo.classList.add('banner-blocked');
      break;
    case 'pearl':
      headerInfo.classList.add('banner-pearl');
      break;
    case 'correct':
      headerInfo.classList.add('banner-correct');
      break;
    case 'error':
      headerInfo.classList.add('banner-error');
      break;
    default:
      // Normal brown wood banner - default .header-info styling
      break;
  }

  // Set the message and mark as modified
  headerInfo.innerHTML = message;
  headerInfo.dataset.hasBeenModified = 'true';

  // Auto-revert to original content if duration is specified
  if (duration > 0) {
    setTimeout(() => {
      resetGameBanner();
    }, duration);
  }
}

export function resetGameBanner() {
  const headerInfo = document.querySelector(window.UI_SELECTORS.HEADER_INFO);
  if (!headerInfo) return;

  // Reset to normal brown wood banner styling but keep current message
  headerInfo.className = 'header-info';
  headerInfo.style.cssText = '';
  
  // Only restore original content if it's the first time or explicitly requested
  if (!headerInfo.dataset.hasBeenModified && headerInfo.dataset.originalContent) {
    headerInfo.innerHTML = headerInfo.dataset.originalContent;
  } else if (!headerInfo.dataset.hasBeenModified) {
    headerInfo.innerHTML = "Pressed : '+' tutorial | Pressed : '-' show map";
  }
  // If hasBeenModified is true, keep the current message
}

export function showBlockedBanner(message) {
  const isKeyInstruction = message.includes('You pressed') || message.includes('BLOCKED') || message.includes('to go');
  showGameBanner(message, 'blocked', 0, isKeyInstruction); // No auto-reset
}

export function showPearlBanner(message) {
  showGameBanner(message, 'pearl', 0); // No auto-reset
}

export function showCorrectMoveBanner(message) {
  const isKeyInstruction = message.includes('You pressed') || message.includes('Press ') || message.includes('to go');
  showGameBanner(message, 'correct', 2000, isKeyInstruction);
}

export function showErrorBanner(message) {
  const isKeyInstruction = message.includes('You pressed') || message.includes('Press ') || message.includes('to go');
  showGameBanner(message, 'error', 2000, isKeyInstruction);
}

export function showNormalBanner(message, duration = 0) {
  // Check if this is a key instruction message
  const isKeyInstruction = message.includes('You pressed') || message.includes('Type number:') || message.includes('Press ') || message.includes('to go');
  showGameBanner(message, 'normal', duration, isKeyInstruction); // Default no auto-reset
}