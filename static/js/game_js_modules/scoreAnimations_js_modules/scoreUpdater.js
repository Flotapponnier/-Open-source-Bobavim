import { getScoreElement, setScoreElement, getLastScore, setLastScore } from './scoreState.js';
import { triggerPenaltyAnimation, triggerPearlAnimation } from './animationEffects.js';

// Track if low score message has been triggered to prevent repeats
let lowScoreTriggered = false;

// Initialize the score animation system
export function initializeScoreAnimations() {
  const scoreElement = document.getElementById('score');
  setScoreElement(scoreElement);
  if (scoreElement) {
    const lastScore = parseInt(scoreElement.textContent) || 0;
    setLastScore(lastScore);
    logger.debug('Score animations initialized with score:', lastScore);
  }
}

// Update score and trigger appropriate animation
export function updateScoreWithAnimation(newScore, reason = 'normal') {
  let scoreElement = getScoreElement();
  if (!scoreElement) {
    scoreElement = document.getElementById('score');
    setScoreElement(scoreElement);
    if (!scoreElement) return;
  }

  const oldScore = getLastScore();
  const scoreDiff = newScore - oldScore;
  
  // Update the score text
  scoreElement.textContent = newScore;
  setLastScore(newScore);

  // Clear any existing animations
  scoreElement.classList.remove('score-penalty', 'score-pearl');

  // Apply appropriate animation based on score change
  if (reason === 'pearl' || (scoreDiff > 0 && scoreDiff >= 100)) {
    // Pearl collection (positive score)
    triggerPearlAnimation();
  } else if (reason === 'penalty' || scoreDiff < 0) {
    // Score penalty (negative score)
    triggerPenaltyAnimation();
  }
  
  logger.debug(`Score updated: ${oldScore} → ${newScore} (${scoreDiff > 0 ? '+' : ''}${scoreDiff}) [${reason}]`);
}

// Start monitoring score changes
export function startScoreMonitoring() {
  // Initialize the score animations
  initializeScoreAnimations();
  
  // Set up periodic monitoring of score element for changes
  const scoreElement = getScoreElement() || document.getElementById('score');
  
  if (scoreElement) {
    setScoreElement(scoreElement);
    let lastKnownScore = parseInt(scoreElement.textContent) || 0;
    setLastScore(lastKnownScore);
    
    const monitorInterval = setInterval(() => {
      const currentScore = parseInt(scoreElement.textContent) || 0;
      if (currentScore !== lastKnownScore) {
        const scoreDiff = currentScore - lastKnownScore;
        let reason = 'external';
        
        // Determine the reason based on score change
        if (scoreDiff > 0 && scoreDiff >= 100) {
          reason = 'pearl';
        } else if (scoreDiff < 0) {
          reason = 'penalty';
        }
        
        updateScoreWithAnimation(currentScore, reason);
        lastKnownScore = currentScore;
        
        // Check for low score trigger (-200 or lower)
        if (currentScore <= -200 && !lowScoreTriggered) {
          lowScoreTriggered = true;
          logger.debug('Low score triggered at:', currentScore);
          
          // Trigger Uncle Boba's low score message
          if (window.tutorialHintsModule && window.tutorialHintsModule.triggerLowScoreMessage) {
            setTimeout(() => {
              window.tutorialHintsModule.triggerLowScoreMessage();
            }, 1000); // Delay slightly to let score animation finish
          }
        }
        
        // Reset trigger if score improves significantly (above -100)
        if (currentScore > -100 && lowScoreTriggered) {
          lowScoreTriggered = false;
          logger.debug('Low score trigger reset, score improved to:', currentScore);
        }
      }
    }, 100); // Check every 100ms
    
    logger.debug('Score monitoring started with initial score:', lastKnownScore);
    
    // Store the interval ID for potential cleanup
    window.scoreMonitoringInterval = monitorInterval;
  } else {
    logger.warn('Score element not found, cannot start monitoring');
  }
}

// Reset the low score trigger (useful for testing or map resets)
export function resetLowScoreTrigger() {
  lowScoreTriggered = false;
  logger.debug('Low score trigger manually reset');
}

// Get current low score trigger status (for debugging)
export function isLowScoreTriggered() {
  return lowScoreTriggered;
}