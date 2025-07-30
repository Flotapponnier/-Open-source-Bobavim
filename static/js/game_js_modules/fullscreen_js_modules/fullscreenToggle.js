let isFullscreenMode = false;

export function toggleFullscreen() {
  if (isFullscreenMode) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

export function enterFullscreen() {
  const gameContainer = document.querySelector('.game-container');
  const body = document.body;
  
  if (gameContainer && body) {
    // Add fullscreen class to body for CSS styling
    body.classList.add('fullscreen-mode');
    
    // Hide header and UI elements
    hideUIElements();
    
    // Apply intelligent responsive scaling to accommodate larger area with delay
    setTimeout(() => {
      if (window.intelligentScaling) {
        window.intelligentScaling.forceUpdate();
      } else if (window.responsiveScaling && window.responsiveScaling.triggerScaling) {
        window.responsiveScaling.triggerScaling();
      } else if (window.responsiveScaling && window.responsiveScaling.applyScaling) {
        window.responsiveScaling.applyScaling();
      }
    }, 150);
    
    // Save preference
    if (window.userPreferencesModule) {
      window.userPreferencesModule.updatePreference('fullscreen', true);
    }
    
    // Show feedback
    if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
      window.feedbackModule.showMovementFeedback('Fullscreen mode ENABLED', 1);
    }
    
    isFullscreenMode = true;
  }
}

export function exitFullscreen() {
  const body = document.body;
  
  if (body) {
    // Remove fullscreen class from body
    body.classList.remove('fullscreen-mode');
    
    // Show header and UI elements
    showUIElements();
    
    // Reapply intelligent responsive scaling with delay to allow layout to settle
    setTimeout(() => {
      if (window.intelligentScaling) {
        window.intelligentScaling.forceUpdate();
      } else if (window.responsiveScaling && window.responsiveScaling.triggerScaling) {
        window.responsiveScaling.triggerScaling();
      } else if (window.responsiveScaling && window.responsiveScaling.applyScaling) {
        window.responsiveScaling.applyScaling();
      }
    }, 150);
    
    // Save preference
    if (window.userPreferencesModule) {
      window.userPreferencesModule.updatePreference('fullscreen', false);
    }
    
    // Show feedback
    if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
      window.feedbackModule.showMovementFeedback('Fullscreen mode DISABLED', 1);
    }
    
    isFullscreenMode = false;
  }
}

export function isFullscreenActive() {
  return isFullscreenMode;
}

function hideUIElements() {
  const elementsToHide = [
    '.game-header'
  ];
  
  elementsToHide.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'none';
    }
  });
}

function showUIElements() {
  const elementsToShow = [
    { selector: '.game-header', display: 'flex' }
  ];
  
  elementsToShow.forEach(({ selector, display }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = display;
    }
  });
}