// Survey module for collecting user feedback with slide-down panel
import { toggleSurveyPanel, showSurveyPanel, hideSurveyPanel, setupSurveyEventListeners } from './survey_js_modules/surveyModal.js';
import { getUserSurveyData } from './survey_js_modules/surveyStorage.js';

export async function initializeSurvey() {
  const surveyButton = document.getElementById('surveyButton');
  
  if (!surveyButton) {
    logger.debug('Survey button not found');
    return;
  }
  
  logger.debug('Initializing survey system...');
  
  // Setup button click handler for toggle functionality
  surveyButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    logger.debug('Survey button clicked - toggling panel');
    toggleSurveyPanel();
  });
  
  // Setup survey event listeners
  setupSurveyEventListeners();
  
  // Update button appearance if user has already voted
  await updateButtonAppearance();
  
  // Start periodic survey refresh
  startSurveyRefresh();
  
  logger.debug('Survey system initialized successfully');
}

function startSurveyRefresh() {
  // Check for survey changes every 30 seconds
  setInterval(async () => {
    await refreshSurveyIfChanged();
  }, 30000);
  
  // Also refresh when page becomes visible again
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      await refreshSurveyIfChanged();
    }
  });
}

async function refreshSurveyIfChanged() {
  try {
    // Import the clearAllCaches function
    const { clearAllCaches } = await import('./survey_js_modules/surveyStorage.js');
    
    // Clear caches to force refresh
    clearAllCaches();
    
    // Update button appearance with new survey data
    await updateButtonAppearance();
    
    logger.debug('Survey data refreshed');
  } catch (error) {
    logger.error('Error refreshing survey:', error);
  }
}

async function updateButtonAppearance() {
  try {
    const userData = await getUserSurveyData();
    const surveyText = document.querySelector('.survey-text');
    const plusSign = document.querySelector('.survey-plus');
    
    if (userData.hasVoted && surveyText && plusSign) {
      // Show rating in button text
      surveyText.textContent = `Survey (${userData.userRating}/10)`;
      plusSign.textContent = '✓';
      
      // Add subtle visual feedback
      const button = document.getElementById('surveyButton');
      if (button) {
        button.style.boxShadow += ', 0 0 15px rgba(46, 204, 113, 0.3)';
        button.title = `Survey - You rated: ${userData.userRating}/10 (Click to change)`;
      }
    } else if (surveyText && plusSign) {
      surveyText.textContent = 'Survey';
      plusSign.textContent = '+';
      
      const button = document.getElementById('surveyButton');
      if (button) {
        button.title = 'Survey - Rate our game (Click to open)';
      }
    }
  } catch (error) {
    logger.error('Error updating button appearance:', error);
  }
}

export { toggleSurveyPanel, showSurveyPanel, hideSurveyPanel };