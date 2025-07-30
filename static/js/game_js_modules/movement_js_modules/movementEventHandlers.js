import { movePlayer } from './playerMovement.js';
import { 
  getCharSearchDirection, 
  showCharWaitingFeedback, 
  clearCharWaitingFeedback,
  showGCommandFeedback,
  clearGCommandFeedback
} from './movementHelpers.js';
import { toggleSpriteVisibility } from './spriteVisibility.js';

export function initializeMovement() {
  let lastKeyPressed = null;
  let keyReleased = true;
  
  // Character search state
  let waitingForChar = false;
  let charSearchMotion = null;
  
  // G-command state
  let waitingForGCommand = false;
  
  // Number prefix state
  let numberPrefix = '';
  let accumulatingNumber = false;
  
  // Space modifier state
  let waitingForSpaceCommand = false;
  let spaceTimeout = null;
  let lastSpaceTime = 0;

  document.addEventListener("keydown", function (event) {
    const key = event.key;
    
    // Handle space modifier commands
    if (waitingForSpaceCommand) {
      clearTimeout(spaceTimeout);
      waitingForSpaceCommand = false;
      
      
      switch (key.toLowerCase()) {
        case 'enter':
          // Space + Enter: Toggle character visibility
          const message = toggleSpriteVisibility();
          if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
            window.feedbackModule.showMovementFeedback(message, 1);
          }
          // Save preference
          if (window.userPreferencesModule && window.spriteVisibilityModule) {
            const isVisible = !window.spriteVisibilityModule.areSpritesHidden();
            window.userPreferencesModule.updatePreference('characterVisible', isVisible);
          }
          event.preventDefault();
          return;
        case 'h':
          // Space + H: Show manual + toggle tutorial hints
          if (window.vimManualModule && window.vimManualModule.animateHelpText) {
            const helpText = document.getElementById('helpText');
            if (helpText) {
              window.vimManualModule.animateHelpText(helpText);
              
              // Also toggle tutorial hints if available
              if (window.tutorialHintsModule && window.tutorialHintsModule.toggleHint) {
                window.tutorialHintsModule.toggleHint();
              }
            } else {
              logger.debug('Help text element not found');
            }
          } else {
            logger.debug('VimManual module not available');
          }
          event.preventDefault();
          return;
        case 'm':
          // Space + M: Toggle mini map
          if (window.mapModule && window.mapModule.handleMapToggle) {
            window.mapModule.handleMapToggle();
          }
          event.preventDefault();
          return;
        case 't':
          // Space + T: Toggle tutorial
          if (window.tutorialModule && window.tutorialModule.toggleTutorialMode) {
            window.tutorialModule.toggleTutorialMode();
            const status = window.gameState.tutorialMode ? "ACTIVATED" : "DEACTIVATED";
            if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
              window.feedbackModule.showMovementFeedback(`TUTORIAL MODE ${status}`, 1);
            }
          }
          event.preventDefault();
          return;
        case 'n':
          // Space + N: Toggle line numbers (disable relative line numbers if active)
          if (window.lineNumbersModule && window.lineNumbersModule.toggleLineNumbers) {
            // If relative line numbers are active, disable them first
            if (window.relativeLineNumbersModule && window.relativeLineNumbersModule.areRelativeLineNumbersVisible()) {
              window.relativeLineNumbersModule.hideRelativeLineNumbers();
              if (window.userPreferencesModule) {
                window.userPreferencesModule.updatePreference('relativeLineNumbers', false);
              }
            }
            
            const message = window.lineNumbersModule.toggleLineNumbers();
            if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
              window.feedbackModule.showMovementFeedback(message, 1);
            }
            // Save preference
            if (window.userPreferencesModule) {
              const isVisible = window.lineNumbersModule.areLineNumbersVisible();
              window.userPreferencesModule.updatePreference('lineNumbers', isVisible);
            }
          }
          event.preventDefault();
          return;
        case 'r':
          // Space + R: Toggle relative line numbers (disable absolute line numbers if active)
          if (window.relativeLineNumbersModule && window.relativeLineNumbersModule.toggleRelativeLineNumbers) {
            // If absolute line numbers are active, disable them first
            if (window.lineNumbersModule && window.lineNumbersModule.areLineNumbersVisible()) {
              window.lineNumbersModule.hideLineNumbers();
              if (window.userPreferencesModule) {
                window.userPreferencesModule.updatePreference('lineNumbers', false);
              }
            }
            
            const message = window.relativeLineNumbersModule.toggleRelativeLineNumbers();
            if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
              window.feedbackModule.showMovementFeedback(message, 1);
            }
            // Save preference
            if (window.userPreferencesModule) {
              const isVisible = window.relativeLineNumbersModule.areRelativeLineNumbersVisible();
              window.userPreferencesModule.updatePreference('relativeLineNumbers', isVisible);
            }
          }
          event.preventDefault();
          return;
        case ' ':
          // Space + Space: Toggle space character highlighting
          if (window.spaceHighlightModule && window.spaceHighlightModule.toggleSpaceHighlight) {
            const message = window.spaceHighlightModule.toggleSpaceHighlight();
            if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
              window.feedbackModule.showMovementFeedback(message, 1);
            }
            // Save preference
            if (window.userPreferencesModule) {
              const isActive = window.spaceHighlightModule.isSpaceHighlightActive();
              window.userPreferencesModule.updatePreference('spaceHighlighting', isActive);
            }
          }
          event.preventDefault();
          return;
        case 'f':
          // Space + F: Toggle fullscreen mode
          if (window.fullscreenModule && window.fullscreenModule.toggleFullscreen) {
            window.fullscreenModule.toggleFullscreen();
          }
          event.preventDefault();
          return;
        default:
          // Invalid space command, do nothing
          event.preventDefault();
          return;
      }
    }
    
    // Handle space key (start space command mode) - but only if not waiting for character search
    if (key === ' ' && !waitingForChar && !waitingForGCommand) {
      waitingForSpaceCommand = true;
      // Clear space command mode after 1 second if no key is pressed
      spaceTimeout = setTimeout(() => {
        waitingForSpaceCommand = false;
      }, 1000);
      event.preventDefault();
      return;
    }

    // Handle number input accumulation
    if (!waitingForChar && !waitingForGCommand && /^[0-9]$/.test(key)) {
      // Don't start with 0 unless it's the only digit
      if (key === '0' && numberPrefix === '') {
        // 0 is a movement command (go to beginning of line), not a number prefix
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(key);
        } else {
          window.feedbackModule.showMovementFeedback(key);
        }
        movePlayer(key, 1);
        event.preventDefault();
        return;
      }
      
      // Limit number prefix to prevent extremely large numbers
      if (numberPrefix.length >= 4) {
        event.preventDefault();
        return;
      }
      
      numberPrefix += key;
      accumulatingNumber = true;
      
      // Show number prefix feedback
      if (window.feedbackModule && window.feedbackModule.showNumberPrefix) {
        window.feedbackModule.showNumberPrefix(numberPrefix);
      }
      
      event.preventDefault();
      return;
    }

    if (waitingForChar) {
      if (key.length === 1) {
        const fullDirection = getCharSearchDirection(charSearchMotion, key);
        const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
        
        waitingForChar = false;
        charSearchMotion = null;
        
        clearCharWaitingFeedback();
        
        // Clear number prefix state
        const finalDirection = count > 1 ? `${count}${fullDirection}` : fullDirection;
        numberPrefix = '';
        accumulatingNumber = false;
        
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(finalDirection);
        } else {
          window.feedbackModule.showMovementFeedback(finalDirection, count);
        }
        
        movePlayer(fullDirection, count);
        event.preventDefault();
      } else if (key === 'Escape') {
        waitingForChar = false;
        charSearchMotion = null;
        clearCharWaitingFeedback();
        
        // Clear number prefix on escape
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        event.preventDefault();
      }
      return;
    }

    if (waitingForGCommand) {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
        return;
      }
      
      if (key === 'g') {
        const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
        const finalDirection = count > 1 ? `${count}gg` : 'gg';
        
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Clear number prefix state
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(finalDirection);
        } else {
          window.feedbackModule.showMovementFeedback(finalDirection, count);
        }
        
        movePlayer('gg', count);
        event.preventDefault();
      } else if (key === '_') {
        const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
        const finalDirection = count > 1 ? `${count}g_` : 'g_';
        
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Clear number prefix state
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(finalDirection);
        } else {
          window.feedbackModule.showMovementFeedback(finalDirection, count);
        }
        
        movePlayer('g_', count);
        event.preventDefault();
      } else if (key === 'e') {
        const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
        const finalDirection = count > 1 ? `${count}ge` : 'ge';
        
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Clear number prefix state
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(finalDirection);
        } else {
          window.feedbackModule.showMovementFeedback(finalDirection, count);
        }
        
        movePlayer('ge', count);
        event.preventDefault();
      } else if (key === 'E') {
        const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
        const finalDirection = count > 1 ? `${count}gE` : 'gE';
        
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Clear number prefix state
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        if (window.gameState.tutorialMode) {
          window.tutorialModule.handleTutorialMovement(finalDirection);
        } else {
          window.feedbackModule.showMovementFeedback(finalDirection, count);
        }
        
        movePlayer('gE', count);
        event.preventDefault();
      } else if (key === 'Escape') {
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Clear number prefix on escape
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
        
        event.preventDefault();
      } else {
        waitingForGCommand = false;
        clearGCommandFeedback();
        
        // Handle invalid g-command in tutorial mode
        if (window.gameState.tutorialMode) {
          const invalidCommand = `g${key}`;
          window.tutorialModule.handleTutorialMovement(invalidCommand);
        }
        
        // Clear number prefix when invalid G command
        numberPrefix = '';
        accumulatingNumber = false;
        if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
          window.feedbackModule.clearNumberPrefix();
        }
      }
      return;
    }

    // Enter key alone no longer toggles sprite visibility (use Space+Enter instead)

    // Handle arrow keys specifically
    if (['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'].includes(key)) {
      if (event.repeat || (lastKeyPressed === key && !keyReleased)) {
        event.preventDefault();
        return;
      }

      // Skip regular movement processing if waiting for g-command
      if (waitingForGCommand) {
        return;
      }

      lastKeyPressed = key;
      keyReleased = false;

      // Handle movement with number prefix for arrow keys
      const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
      const finalDirection = count > 1 ? `${count}${key}` : key;
      
      // Clear number prefix state
      numberPrefix = '';
      accumulatingNumber = false;
      if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
        window.feedbackModule.clearNumberPrefix();
      }

      if (window.gameState.tutorialMode) {
        window.tutorialModule.handleTutorialMovement(finalDirection);
      } else {
        window.feedbackModule.showMovementFeedback(finalDirection, count);
      }

      // Send arrow key to server
      movePlayer(key, count);
      event.preventDefault();
      return;
    }

    if (window.VALID_MOVEMENT_KEYS.includes(key)) {
      if (event.repeat || (lastKeyPressed === key && !keyReleased)) {
        event.preventDefault();
        return;
      }

      // Skip regular movement processing if waiting for g-command  
      if (waitingForGCommand) {
        return;
      }

      lastKeyPressed = key;
      keyReleased = false;


      if (['f', 'F', 't', 'T'].includes(key)) {
        waitingForChar = true;
        charSearchMotion = key;
        
        // In tutorial mode, don't show the "FIND CHAR" feedback
        if (!window.gameState.tutorialMode) {
          showCharWaitingFeedback(key);
        }
        
        event.preventDefault();
        return;
      }

      if (key === 'g') {
        waitingForGCommand = true;
        
        // In tutorial mode, don't show the "G-COMMAND" feedback
        if (!window.gameState.tutorialMode) {
          showGCommandFeedback();
        }
        
        event.preventDefault();
        return;
      }

      // Handle movement with number prefix
      const count = numberPrefix === '' ? 1 : parseInt(numberPrefix);
      const hasExplicitCount = numberPrefix !== '';
      const finalDirection = count > 1 ? `${count}${key}` : key;
      
      // Clear number prefix state
      numberPrefix = '';
      accumulatingNumber = false;
      if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
        window.feedbackModule.clearNumberPrefix();
      }

      if (window.gameState.tutorialMode) {
        window.tutorialModule.handleTutorialMovement(finalDirection);
      } else {
        window.feedbackModule.showMovementFeedback(finalDirection, count, hasExplicitCount);
      }

      // Send base key to server, not the prefixed version
      movePlayer(key, count, hasExplicitCount);
      event.preventDefault();
    }
    
    // Handle escape key to clear number prefix
    if (key === 'Escape' && accumulatingNumber) {
      numberPrefix = '';
      accumulatingNumber = false;
      if (window.feedbackModule && window.feedbackModule.clearNumberPrefix) {
        window.feedbackModule.clearNumberPrefix();
      }
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function (event) {
    const key = event.key;

    if (window.VALID_MOVEMENT_KEYS.includes(key)) {
      if (lastKeyPressed === key) {
        keyReleased = true;
      }
    }
  });
}