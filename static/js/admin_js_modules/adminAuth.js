/**
 * Admin Authentication Module
 * Handles admin login, logout, and session management
 */

class AdminAuth {
  constructor() {
    this.API_ENDPOINTS = {
      LOGIN: '/api/admin/login',
      LOGOUT: '/api/admin/logout',
      CHECK_STATUS: '/api/admin/status'
    };
    
    this.init();
  }

  init() {
    // Check if user is already authenticated as admin
    this.checkAdminStatus();
    
    // Bind logout event
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  async checkAdminStatus() {
    try {
      const response = await fetch(this.API_ENDPOINTS.CHECK_STATUS);
      const data = await response.json();
      
      if (!data.is_admin) {
        // Redirect to login if not admin
        this.redirectToLogin();
        return false;
      }
      
      // Update UI with admin info
      const usernameEl = document.getElementById('adminUsername');
      if (usernameEl && data.username) {
        usernameEl.textContent = data.username;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to check admin status:', error);
      this.redirectToLogin();
      return false;
    }
  }

  async logout() {
    try {
      const response = await fetch(this.API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Logged out successfully', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        this.showMessage('Logout failed', 'error');
      }
    } catch (error) {
      logger.error('Logout error:', error);
      this.showMessage('Logout failed', 'error');
    }
  }

  redirectToLogin() {
    // Show login modal instead of redirecting
    this.showLoginModal();
  }

  showLoginModal() {
    // Create login modal dynamically
    const modalHTML = `
      <div id="adminLoginModal" class="modal-overlay" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Admin Login</h3>
            <button id="closeAdminLoginModal" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <form id="adminLoginForm">
              <div class="form-group">
                <label for="adminUsername">Username:</label>
                <input type="text" id="adminUsername" name="username" required>
              </div>
              <div class="form-group">
                <label for="adminPassword">Password:</label>
                <input type="password" id="adminPassword" name="password" required>
              </div>
              <div class="form-actions">
                <button type="submit" class="button-base submit-btn">Login</button>
                <button type="button" id="cancelAdminLogin" class="button-base cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('adminLoginModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind events
    this.bindLoginModalEvents();
  }

  bindLoginModalEvents() {
    const modal = document.getElementById('adminLoginModal');
    const closeBtn = document.getElementById('closeAdminLoginModal');
    const cancelBtn = document.getElementById('cancelAdminLogin');
    const form = document.getElementById('adminLoginForm');

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideLoginModal());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideLoginModal());
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideLoginModal();
        }
      });
    }

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }
  }

  hideLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
      modal.remove();
    }
    // Redirect to main page
    window.location.href = '/';
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      username: formData.get('username'),
      password: formData.get('password')
    };

    try {
      const response = await fetch(this.API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage('Login successful! Redirecting...', 'success');
        this.hideLoginModal();
        setTimeout(() => {
          window.location.reload(); // Reload the admin page
        }, 1000);
      } else {
        this.showMessage(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      logger.error('Login error:', error);
      this.showMessage('Login failed', 'error');
    }
  }

  showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }
}

// Initialize admin auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminAuth = new AdminAuth();
});