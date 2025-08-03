/**
 * Admin Main Module
 * Handles general admin panel functionality and navigation
 */

class AdminMain {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeTypingAnimation();
  }

  bindEvents() {
    // Back to index button
    const backBtn = document.getElementById('backToIndexBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  handleKeyboardShortcuts(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
    
    // Ctrl/Cmd + N for new newsletter
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (window.adminNewsletter) {
        window.adminNewsletter.showCreateModal();
      }
    }
    
    // Ctrl/Cmd + S for new survey
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (window.adminSurvey) {
        window.adminSurvey.showCreateModal();
      }
    }
  }

  closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }

  initializeTypingAnimation() {
    // Disabled for admin page - set text immediately for better performance
    const titleElement = document.querySelector('.typing-title');
    if (!titleElement) return;

    const text = titleElement.getAttribute('data-text') || titleElement.textContent;
    titleElement.textContent = text; // Set immediately without animation
  }

  // Utility method for showing toast messages
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `message ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto-remove after specified duration
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  // Method to check if user has unsaved changes
  hasUnsavedChanges() {
    const forms = document.querySelectorAll('form');
    for (let form of forms) {
      const formData = new FormData(form);
      for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
          return true;
        }
      }
    }
    return false;
  }

  // Warn user before leaving if they have unsaved changes
  setupUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }
}

// Initialize admin main when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminMain = new AdminMain();
});