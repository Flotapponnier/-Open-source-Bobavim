export class SpaceCommandHandler {
  constructor(keyboardHandler) {
    this.keyboardHandler = keyboardHandler;
    this.game = keyboardHandler.game;
    
    // Space command state
    this.waitingForSpaceCommand = false;
    this.spaceTimeout = null;
  }

  shouldHandleSpaceCommand(key) {
    return this.waitingForSpaceCommand || key === ' ';
  }

  handleSpaceCommand(event) {
    const key = event.key;
    
    // If we're waiting for a space command, handle the second key
    if (this.waitingForSpaceCommand) {
      // Clear the timeout
      if (this.spaceTimeout) {
        clearTimeout(this.spaceTimeout);
        this.spaceTimeout = null;
      }
      
      // Reset waiting state
      this.waitingForSpaceCommand = false;
      
      // Handle the specific space command
      switch (key.toLowerCase()) {
        case 'enter':
          // Space + Enter: Toggle character visibility
          this.toggleCharacterVisibility();
          event.preventDefault();
          return true;
          
        case 'n':
          // Space + N: Toggle line numbers (disable relative line numbers if active)
          this.toggleLineNumbers();
          event.preventDefault();
          return true;
          
        case 'r':
          // Space + R: Toggle relative line numbers (disable absolute line numbers if active)
          this.toggleRelativeLineNumbers();
          event.preventDefault();
          return true;
          
        case ' ':
          // Space + Space: Toggle space character highlighting
          this.toggleSpaceHighlight();
          event.preventDefault();
          return true;
          
        case 'f':
          // Space + F: Toggle fullscreen mode
          this.toggleFullscreen();
          event.preventDefault();
          return true;
          
        default:
          // Invalid space command, do nothing
          event.preventDefault();
          return true;
      }
    }
    
    // Handle space key (start space command mode)
    if (key === ' ') {
      this.waitingForSpaceCommand = true;
      
      // Clear space command mode after 1 second if no key is pressed
      this.spaceTimeout = setTimeout(() => {
        this.waitingForSpaceCommand = false;
        this.spaceTimeout = null;
      }, 1000);
      
      event.preventDefault();
      return true;
    }
    
    return false;
  }

  toggleLineNumbers() {
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
      logger.debug('🔢 Multiplayer: Toggled line numbers -', message);
    }
  }

  toggleRelativeLineNumbers() {
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
      logger.debug('🔢 Multiplayer: Toggled relative line numbers -', message);
    }
  }

  toggleSpaceHighlight() {
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
      logger.debug('⎵ Multiplayer: Toggled space highlighting -', message);
    }
  }

  toggleFullscreen() {
    if (window.fullscreenModule && window.fullscreenModule.toggleFullscreen) {
      window.fullscreenModule.toggleFullscreen();
      logger.debug('🖥️ Multiplayer: Toggled fullscreen');
    }
  }

  toggleCharacterVisibility() {
    // Import the toggleSpriteVisibility function
    import('/static/js/game_js_modules/movement_js_modules/spriteVisibility.js')
      .then(module => {
        const message = module.toggleSpriteVisibility();
        if (window.feedbackModule && window.feedbackModule.showMovementFeedback) {
          window.feedbackModule.showMovementFeedback(message, 1);
        }
        // Save preference
        if (window.userPreferencesModule && window.spriteVisibilityModule) {
          const isVisible = !window.spriteVisibilityModule.areSpritesHidden();
          window.userPreferencesModule.updatePreference('characterVisible', isVisible);
        }
        logger.debug('👤 Multiplayer: Toggled character visibility -', message);
      })
      .catch(error => {
        logger.warn('Could not load sprite visibility module:', error);
      });
  }

  // Clean up any pending timeouts
  cleanup() {
    if (this.spaceTimeout) {
      clearTimeout(this.spaceTimeout);
      this.spaceTimeout = null;
    }
    this.waitingForSpaceCommand = false;
  }
}