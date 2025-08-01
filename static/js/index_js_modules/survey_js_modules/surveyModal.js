import { getUserSurveyData, submitUserRating, clearUserVote, getCommunityData, submitUserChoice, submitUserText } from './surveyStorage.js';

let selectedRating = 1;
let isOpen = false;

export function toggleSurveyPanel() {
  const panel = document.getElementById('surveyPanel');
  const button = document.getElementById('surveyButton');
  const plusSign = document.getElementById('surveyPlus');
  
  if (!panel || !button) return;
  
  if (isOpen) {
    hideSurveyPanel();
  } else {
    showSurveyPanel();
  }
}

export async function showSurveyPanel() {
  const panel = document.getElementById('surveyPanel');
  const button = document.getElementById('surveyButton');
  const plusSign = document.getElementById('surveyPlus');
  
  if (!panel || !button) return;
  
  // Load survey content dynamically
  await loadSurveyContent();
  
  // Setup dynamic event listeners for the loaded content
  setupDynamicEventListeners();
  
  // Initialize survey state
  initializeSurveyState();
  
  // Show panel with animation
  panel.classList.remove('hidden');
  panel.classList.add('visible');
  
  // Update button state
  button.classList.add('active');
  
  // Hide vim cursor when survey panel is open
  if (window.hideCursor) {
    window.hideCursor();
  }
  
  isOpen = true;
}

export function hideSurveyPanel() {
  const panel = document.getElementById('surveyPanel');
  const button = document.getElementById('surveyButton');
  
  if (!panel || !button) return;
  
  // Hide panel with animation
  panel.classList.remove('visible');
  panel.classList.add('hidden');
  
  // Update button state
  button.classList.remove('active');
  
  // Show vim cursor when survey panel is closed
  if (window.showCursor) {
    window.showCursor();
  }
  
  isOpen = false;
}

async function loadSurveyContent() {
  try {
    // Get current active survey
    const response = await fetch('/api/surveys/');
    const data = await response.json();
    
    if (!data.success || !data.surveys || data.surveys.length === 0) {
      logger.error('No active survey found');
      return;
    }
    
    const survey = data.surveys[0];
    const question = survey.questions[0]; // Get first question
    
    // Update survey title and description
    const titleElement = document.getElementById('surveyTitle');
    const descriptionElement = document.getElementById('surveyDescription');
    
    if (titleElement) {
      titleElement.textContent = survey.title;
    }
    if (descriptionElement) {
      descriptionElement.textContent = survey.description || '';
    }
    
    // Generate survey content based on question type
    const contentElement = document.getElementById('surveyContent');
    if (contentElement && question) {
      if (question.question_type === 'rating') {
        contentElement.innerHTML = generateRatingContent(question);
      } else if (question.question_type === 'multiple_choice') {
        contentElement.innerHTML = generateMultipleChoiceContent(question);
      } else if (question.question_type === 'text') {
        contentElement.innerHTML = generateTextContent(question);
      }
    }
    
  } catch (error) {
    logger.error('Error loading survey content:', error);
  }
}

function generateRatingContent(question) {
  const minValue = question.min_value || 1;
  const maxValue = question.max_value || 10;
  
  let ratingOptions = '';
  for (let i = minValue; i <= maxValue; i++) {
    ratingOptions += `<div class="rating-option ${i === minValue ? 'selected' : ''}" data-rating="${i}">${i}</div>`;
  }
  
  return `
    <p>${question.question_text}</p>
    <div class="rating-container">
      <div class="rating-scroll" id="ratingScroll">
        ${ratingOptions}
      </div>
      <div class="selected-rating">
        Selected: <span id="selectedRating">${minValue}</span>/${maxValue}
      </div>
    </div>
    <div class="survey-actions">
      <button id="submitRating" class="submit-btn">Submit Rating</button>
      <button id="undoRating" class="undo-btn hidden">Vote Again</button>
    </div>
  `;
}

function generateMultipleChoiceContent(question) {
  let options = [];
  try {
    options = JSON.parse(question.options || '[]');
  } catch (e) {
    logger.error('Error parsing multiple choice options:', e);
    return `<p>Error loading survey options</p>`;
  }
  
  const optionButtons = options.map(option => 
    `<button class="choice-option" data-choice="${option}">${option}</button>`
  ).join('');
  
  return `
    <p>${question.question_text}</p>
    <div class="choice-container">
      ${optionButtons}
    </div>
    <div class="survey-actions">
      <button id="submitChoice" class="submit-btn" disabled>Submit Choice</button>
      <button id="undoChoice" class="undo-btn hidden">Vote Again</button>
    </div>
  `;
}

function generateTextContent(question) {
  return `
    <p>${question.question_text}</p>
    <div class="text-container">
      <textarea id="textAnswer" placeholder="Enter your response..." rows="4"></textarea>
    </div>
    <div class="survey-actions">
      <button id="submitText" class="submit-btn">Submit Response</button>
      <button id="undoText" class="undo-btn hidden">Vote Again</button>
    </div>
  `;
}

async function initializeSurveyState() {
  try {
    const userData = await getUserSurveyData();
    const communityData = await getCommunityData();
    
    // Set initial rating
    selectedRating = userData.hasVoted ? userData.userRating : 1;
    updateRatingDisplay();
    
    // Show/hide appropriate sections
    const submitBtn = document.getElementById('submitRating');
    const undoBtn = document.getElementById('undoRating');
    const resultsSection = document.getElementById('surveyResults');
    
    if (userData.hasVoted) {
      submitBtn.textContent = 'Update Rating';
      undoBtn.classList.remove('hidden');
      resultsSection.classList.remove('hidden');
      updateResultsDisplay(communityData);
    } else {
      submitBtn.textContent = 'Submit Rating';
      undoBtn.classList.add('hidden');
      resultsSection.classList.add('hidden');
    }
  } catch (error) {
    logger.error('Error initializing survey state:', error);
  }
}

function updateRatingDisplay() {
  // Update selected rating visual
  const ratingOptions = document.querySelectorAll('.rating-option');
  ratingOptions.forEach(option => {
    const rating = parseInt(option.dataset.rating);
    if (rating === selectedRating) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Update selected rating text
  const selectedRatingSpan = document.getElementById('selectedRating');
  if (selectedRatingSpan) {
    selectedRatingSpan.textContent = selectedRating;
  }
}

function updateResultsDisplay(communityData) {
  const averageScore = document.getElementById('averageScore');
  const totalVotes = document.getElementById('totalVotes');
  
  if (averageScore) {
    averageScore.textContent = communityData.average.toFixed(1);
  }
  
  if (totalVotes) {
    totalVotes.textContent = communityData.totalVotes.toLocaleString();
  }
}

export function setupSurveyEventListeners() {
  setupDynamicEventListeners();
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const surveySystem = document.querySelector('.survey-system');
    if (isOpen && surveySystem && !surveySystem.contains(e.target)) {
      hideSurveyPanel();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      hideSurveyPanel();
    }
  });
}

function setupDynamicEventListeners() {
  // Rating selection
  const ratingOptions = document.querySelectorAll('.rating-option');
  ratingOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectedRating = parseInt(option.dataset.rating);
      updateRatingDisplay();
    });
  });
  
  // Submit rating
  const submitBtn = document.getElementById('submitRating');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmitRating);
  }
  
  // Undo rating
  const undoBtn = document.getElementById('undoRating');
  if (undoBtn) {
    undoBtn.addEventListener('click', handleUndoRating);
  }
  
  // Multiple choice selection
  const choiceOptions = document.querySelectorAll('.choice-option');
  choiceOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      choiceOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected class to clicked option
      option.classList.add('selected');
      // Enable submit button
      const submitBtn = document.getElementById('submitChoice');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.dataset.choice = option.dataset.choice;
      }
    });
  });
  
  // Submit choice
  const submitChoiceBtn = document.getElementById('submitChoice');
  if (submitChoiceBtn) {
    submitChoiceBtn.addEventListener('click', handleSubmitChoice);
  }
  
  // Submit text
  const submitTextBtn = document.getElementById('submitText');
  if (submitTextBtn) {
    submitTextBtn.addEventListener('click', handleSubmitText);
  }
}

async function handleSubmitRating() {
  if (selectedRating < 1 || selectedRating > 10) {
    showNotification('Please select a valid rating between 1 and 10', 'error');
    return;
  }
  
  try {
    const result = await submitUserRating(selectedRating);
    
    // Update UI
    const submitBtn = document.getElementById('submitRating');
    const undoBtn = document.getElementById('undoRating');
    const resultsSection = document.getElementById('surveyResults');
    
    submitBtn.textContent = 'Update Rating';
    undoBtn.classList.remove('hidden');
    resultsSection.classList.remove('hidden');
    
    updateResultsDisplay(result.communityData);
    
    // Show success feedback
    showNotification('Thank you for your feedback! 🎉', 'success');
    
    // Update button appearance
    await updateButtonAppearance();
    
  } catch (error) {
    logger.error('Error submitting rating:', error);
    showNotification('Failed to submit rating. Please try again.', 'error');
  }
}

async function handleUndoRating() {
  try {
    const result = await clearUserVote();
    
    // Reset UI
    selectedRating = 1;
    updateRatingDisplay();
    
    const submitBtn = document.getElementById('submitRating');
    const undoBtn = document.getElementById('undoRating');
    const resultsSection = document.getElementById('surveyResults');
    
    submitBtn.textContent = 'Submit Rating';
    undoBtn.classList.add('hidden');
    resultsSection.classList.add('hidden');
    
    showNotification('Your vote has been cleared. You can vote again!', 'info');
    
    // Update button appearance
    await updateButtonAppearance();
    
  } catch (error) {
    logger.error('Error clearing vote:', error);
    showNotification('Failed to clear vote. Please try again.', 'error');
  }
}

async function handleSubmitChoice() {
  const submitBtn = document.getElementById('submitChoice');
  const choice = submitBtn?.dataset.choice;
  
  if (!choice) {
    showNotification('Please select an option', 'error');
    return;
  }
  
  try {
    const result = await submitUserChoice(choice);
    showNotification('Thank you for your feedback! 🎉', 'success');
    // Handle success similar to rating
  } catch (error) {
    logger.error('Error submitting choice:', error);
    showNotification('Failed to submit choice. Please try again.', 'error');
  }
}

async function handleSubmitText() {
  const textArea = document.getElementById('textAnswer');
  const text = textArea?.value.trim();
  
  if (!text) {
    showNotification('Please enter your response', 'error');
    return;
  }
  
  try {
    const result = await submitUserText(text);
    showNotification('Thank you for your feedback! 🎉', 'success');
    // Handle success similar to rating
  } catch (error) {
    logger.error('Error submitting text:', error);
    showNotification('Failed to submit response. Please try again.', 'error');
  }
}

async function updateButtonAppearance() {
  try {
    const userData = await getUserSurveyData();
    const surveyText = document.querySelector('.survey-text');
    const plusSign = document.querySelector('.survey-plus');
    
    if (userData.hasVoted && surveyText && plusSign) {
      surveyText.textContent = `Survey (${userData.userRating}/10)`;
      plusSign.textContent = '✓';
    } else if (surveyText && plusSign) {
      surveyText.textContent = 'Survey';
      plusSign.textContent = '+';
    }
  } catch (error) {
    logger.error('Error updating button appearance:', error);
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `survey-notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}