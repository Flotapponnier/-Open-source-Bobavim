// Authentication handling for leaderboard modal
export class AuthHandlers {
  constructor(modal, closeCallback) {
    this.modal = modal;
    this.close = closeCallback;
  }

  setupGuestEventListeners() {
    // Use event delegation since the buttons are added dynamically
    this.modal.addEventListener('click', (e) => {
      if (e.target.id === 'guest-login-btn') {
        this.handleGuestAction('login');
      } else if (e.target.id === 'guest-register-btn') {
        this.handleGuestAction('register');
      }
    });
  }

  // Consolidated authentication handler to eliminate duplication
  handleGuestAction(type) {
    // Close leaderboard modal
    this.close();
    
    // Wait a moment for the close animation
    setTimeout(() => {
      // Try global function first (most reliable)
      if (window.showAuthModal) {
        window.showAuthModal(type);
        return;
      }

      // Try to find auth button with consolidated selector
      const authButton = this.findAuthButton();
      
      if (authButton) {
        authButton.click();
        
        // Wait for auth modal to open, then switch to appropriate tab
        setTimeout(() => {
          const tab = this.findAuthTab(type);
          if (tab) {
            tab.click();
          }
        }, 100);
      } else {
        // Fallback: dispatch custom event
        document.dispatchEvent(new CustomEvent('openAuthModal', { 
          detail: { mode: type } 
        }));
      }
    }, 100);
  }

  // Consolidated selector logic to eliminate duplication
  findAuthButton() {
    const selectors = [
      '#loginButton',
      '.auth-button', 
      '[data-auth-modal="true"]',
      '.user-auth-btn',
      '#authButton'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  findAuthTab(type) {
    const selectors = type === 'login' 
      ? ['.auth-tab[data-tab="login"]', '.login-tab', '[data-tab="login"]']
      : ['.auth-tab[data-tab="register"]', '.register-tab', '[data-tab="register"]'];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }
}