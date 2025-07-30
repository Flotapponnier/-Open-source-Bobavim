/**
 * Admin Survey Management Module
 * Handles survey creation and management
 */

class AdminSurvey {
  constructor() {
    this.API_ENDPOINTS = {
      CREATE: '/api/admin/survey',
      SURVEYS: '/api/surveys/',
      RESULTS: '/api/surveys/{id}/results'
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Create survey button
    const createBtn = document.getElementById('createSurveyBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateModal());
    }

    // View results button
    const viewResultsBtn = document.getElementById('viewSurveyResultsBtn');
    if (viewResultsBtn) {
      viewResultsBtn.addEventListener('click', () => this.viewSurveyResults());
    }

    // Modal close button
    const closeModalBtn = document.getElementById('closeSurveyModal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideCreateModal());
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelSurveyBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideCreateModal());
    }

    // Form submission
    const form = document.getElementById('surveyForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Question type change
    const questionType = document.getElementById('questionType');
    if (questionType) {
      questionType.addEventListener('change', (e) => this.handleQuestionTypeChange(e));
    }

    // Close modal when clicking outside
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCreateModal();
        }
      });
    }
  }

  showCreateModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'flex';
      // Reset form
      document.getElementById('surveyForm').reset();
      this.handleQuestionTypeChange({ target: { value: 'rating' } });
    }
  }

  hideCreateModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  handleQuestionTypeChange(e) {
    const type = e.target.value;
    const ratingOptions = document.getElementById('ratingOptions');
    const multipleChoiceOptions = document.getElementById('multipleChoiceOptions');

    // Hide all option groups first
    if (ratingOptions) ratingOptions.style.display = 'none';
    if (multipleChoiceOptions) multipleChoiceOptions.style.display = 'none';

    // Show relevant options based on type
    switch (type) {
      case 'rating':
        if (ratingOptions) ratingOptions.style.display = 'block';
        break;
      case 'multiple_choice':
        if (multipleChoiceOptions) multipleChoiceOptions.style.display = 'block';
        break;
      case 'text':
        // No additional options needed for text
        break;
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const questionType = formData.get('type');
    
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      question: {
        text: formData.get('question'),
        type: questionType
      }
    };

    // Add type-specific fields
    if (questionType === 'rating') {
      data.question.min_value = parseInt(formData.get('min_value')) || 1;
      data.question.max_value = parseInt(formData.get('max_value')) || 10;
    } else if (questionType === 'multiple_choice') {
      const options = formData.get('options');
      if (options) {
        // Convert options to JSON array
        const optionArray = options.split('\n').filter(opt => opt.trim()).map(opt => opt.trim());
        data.question.options = JSON.stringify(optionArray);
      }
    }

    // Validate required fields
    if (!data.title || !data.question.text) {
      this.showMessage('Title and question are required', 'error');
      return;
    }

    if (questionType === 'multiple_choice' && (!data.question.options || JSON.parse(data.question.options).length < 2)) {
      this.showMessage('Multiple choice questions need at least 2 options', 'error');
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
        this.showMessage('Survey created successfully! It will replace the previous survey.', 'success');
        this.hideCreateModal();
      } else {
        this.showMessage(result.error || 'Failed to create survey', 'error');
      }
    } catch (error) {
      logger.error('Failed to create survey:', error);
      this.showMessage('Failed to create survey', 'error');
    }
  }

  async viewSurveyResults() {
    try {
      // First, get the active survey
      const surveysResponse = await fetch(this.API_ENDPOINTS.SURVEYS);
      const surveysData = await surveysResponse.json();

      if (!surveysData.success || !surveysData.surveys || surveysData.surveys.length === 0) {
        this.showMessage('No active survey found', 'error');
        return;
      }

      // Get the first active survey
      const activeSurvey = surveysData.surveys[0];
      
      // Now get the results for this survey
      const resultsResponse = await fetch(this.API_ENDPOINTS.RESULTS.replace('{id}', activeSurvey.id));
      const resultsData = await resultsResponse.json();

      if (resultsData.success) {
        this.showSurveyResultsModal(resultsData);
      } else {
        this.showMessage('Failed to load survey results', 'error');
      }
    } catch (error) {
      logger.error('Failed to load survey results:', error);
      this.showMessage('Failed to load survey results', 'error');
    }
  }

  showSurveyResultsModal(data) {
    // Create a modal for showing results
    const modalHTML = `
      <div id="surveyResultsModal" class="modal-overlay" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Survey Results</h3>
            <button id="closeSurveyResultsModal" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <h4>${this.escapeHtml(data.survey.title)}</h4>
            <p>${this.escapeHtml(data.survey.description || '')}</p>
            ${data.survey.questions.map((question, index) => {
              const result = data.results[question.id];
              if (!result) return '';
              
              return `
                <div style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #8B7355; border-radius: 8px;">
                  <h5>${this.escapeHtml(question.question_text)}</h5>
                  <p><strong>Total Votes:</strong> ${result.total_votes}</p>
                  ${result.type === 'rating' ? `
                    <p><strong>Average Rating:</strong> ${result.average ? result.average.toFixed(2) : 'N/A'}</p>
                    <p><strong>Total Score:</strong> ${result.total_score || 0}</p>
                  ` : ''}
                  ${result.type === 'multiple_choice' ? `
                    <div><strong>Option Results:</strong></div>
                    <ul>
                      ${Object.entries(result.option_counts || {}).map(([option, count]) => `
                        <li>${this.escapeHtml(option)} (${count} votes)</li>
                      `).join('')}
                    </ul>
                  ` : ''}
                  ${result.type === 'text' ? `
                    <div><strong>Text Responses:</strong></div>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
                      ${result.responses && result.responses.length > 0 ? 
                        result.responses.map((response, idx) => `
                          <div style="margin-bottom: 10px; padding: 8px; background-color: white; border-radius: 4px; border-left: 3px solid #8B7355;">
                            <small style="color: #666;">#${idx + 1}</small><br>
                            "${this.escapeHtml(response)}"
                          </div>
                        `).join('') : 
                        '<p style="color: #666; font-style: italic;">No responses yet</p>'
                      }
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Remove any existing results modal
    const existingModal = document.getElementById('surveyResultsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add the modal to the page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind close event
    const closeBtn = document.getElementById('closeSurveyResultsModal');
    const modal = document.getElementById('surveyResultsModal');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.remove());
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    }
  }

  escapeHtml(text) {
    if (!text) return '';
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

// Initialize admin survey when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminSurvey = new AdminSurvey();
});