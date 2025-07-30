/**
 * Admin Newsletter Management Module
 * Handles newsletter creation, viewing, and management
 */

class AdminNewsletter {
  constructor() {
    this.API_ENDPOINTS = {
      CREATE: '/api/admin/newsletter',
      LIST: '/api/admin/newsletters',
      DELETE: '/api/admin/newsletter'
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Create newsletter button
    const createBtn = document.getElementById('createNewsletterBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateModal());
    }

    // View newsletters button
    const viewBtn = document.getElementById('viewNewslettersBtn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => this.showNewsletterList());
    }

    // Modal close buttons
    const closeModalBtn = document.getElementById('closeNewsletterModal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideCreateModal());
    }

    const closeListModalBtn = document.getElementById('closeNewsletterListModal');
    if (closeListModalBtn) {
      closeListModalBtn.addEventListener('click', () => this.hideNewsletterListModal());
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelNewsletterBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideCreateModal());
    }

    // Form submission
    const form = document.getElementById('newsletterForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Close modal when clicking outside
    const modal = document.getElementById('newsletterModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCreateModal();
        }
      });
    }

    const listModal = document.getElementById('newsletterListModal');
    if (listModal) {
      listModal.addEventListener('click', (e) => {
        if (e.target === listModal) {
          this.hideNewsletterListModal();
        }
      });
    }
  }

  showCreateModal() {
    const modal = document.getElementById('newsletterModal');
    if (modal) {
      modal.style.display = 'flex';
      // Reset form
      document.getElementById('newsletterForm').reset();
    }
  }

  hideCreateModal() {
    const modal = document.getElementById('newsletterModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  showNewsletterListModal() {
    const modal = document.getElementById('newsletterListModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hideNewsletterListModal() {
    const modal = document.getElementById('newsletterListModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async showNewsletterList() {
    try {
      const response = await fetch(this.API_ENDPOINTS.LIST);
      const data = await response.json();

      if (data.success) {
        this.renderNewsletterList(data.newsletters);
        this.showNewsletterListModal();
      } else {
        this.showMessage('Failed to load newsletters', 'error');
      }
    } catch (error) {
      logger.error('Failed to load newsletters:', error);
      this.showMessage('Failed to load newsletters', 'error');
    }
  }

  renderNewsletterList(newsletters) {
    const container = document.getElementById('newsletterList');
    if (!container) return;

    if (!newsletters || newsletters.length === 0) {
      container.innerHTML = '<p>No newsletters found.</p>';
      return;
    }

    container.innerHTML = newsletters.map(newsletter => `
      <div class="newsletter-item">
        <h4>${this.escapeHtml(newsletter.title)}</h4>
        <p>${this.escapeHtml(newsletter.summary || 'No summary available')}</p>
        <div class="newsletter-date">
          Created: ${new Date(newsletter.created_at).toLocaleDateString()}
        </div>
        <div class="newsletter-actions">
          <button class="delete-newsletter-btn" onclick="window.adminNewsletter.deleteNewsletter(${newsletter.id})">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      summary: formData.get('summary')
    };

    // Validate required fields
    if (!data.title || !data.content) {
      this.showMessage('Title and content are required', 'error');
      return;
    }

    try {
      const response = await fetch(this.API_ENDPOINTS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage('Newsletter created successfully!', 'success');
        this.hideCreateModal();
        // Refresh newsletter list if it's open
        const listModal = document.getElementById('newsletterListModal');
        if (listModal.style.display === 'flex') {
          this.showNewsletterList();
        }
      } else {
        this.showMessage(result.error || 'Failed to create newsletter', 'error');
      }
    } catch (error) {
      logger.error('Failed to create newsletter:', error);
      this.showMessage('Failed to create newsletter', 'error');
    }
  }

  async deleteNewsletter(id) {
    if (!confirm('Are you sure you want to delete this newsletter?')) {
      return;
    }

    try {
      const response = await fetch(`${this.API_ENDPOINTS.DELETE}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.showMessage('Newsletter deleted successfully', 'success');
        // Refresh the list
        this.showNewsletterList();
      } else {
        this.showMessage(result.error || 'Failed to delete newsletter', 'error');
      }
    } catch (error) {
      logger.error('Failed to delete newsletter:', error);
      this.showMessage('Failed to delete newsletter', 'error');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Initialize admin newsletter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminNewsletter = new AdminNewsletter();
});