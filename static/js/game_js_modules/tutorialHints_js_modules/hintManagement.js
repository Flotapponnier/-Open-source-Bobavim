import { TUTORIAL_HINTS, getHintForMap, LOW_SCORE_MESSAGE } from './hintContent.js';
import { getCurrentMapId, getCurrentSpeechType, setCurrentSpeechType } from './hintState.js';
import { startSpeech, createHintSystem, hideSpeech } from './hintDisplay.js';

// Function to update hint text for a specific map (for easy customization)
export function updateHintText(mapId, newHintText) {
  TUTORIAL_HINTS[mapId] = newHintText;

  // Update displayed text if currently showing
  const hintText = document.getElementById("tutorial-hint-text");
  if (hintText && getCurrentMapId() === mapId) {
    hintText.textContent = newHintText;
  }
}

// Function to get current hint text (for easy reading)
export function getHintText(mapId) {
  return getHintForMap(mapId);
}

// Function to trigger low score intervention message
export function triggerLowScoreMessage() {
  const currentSpeech = getCurrentSpeechType();
  
  // If tutorial is currently speaking, stop it
  if (currentSpeech === 'tutorial') {
    hideSpeech();
  }
  
  // Create hint system if it doesn't exist
  let hintContainer = document.getElementById("tutorial-hint-container");
  if (!hintContainer) {
    createHintSystem('low-score');
  }
  
  // Start low score speech directly
  startLowScoreSpeech();
}

function startLowScoreSpeech() {
  // Stop any current speech
  if (getCurrentSpeechType()) {
    hideSpeech();
  }
  
  // Manually trigger the speech system with low score content
  const speechBubble = document.getElementById("speech-bubble");
  const speechText = document.getElementById("speech-text");
  const navigationControls = document.getElementById("speech-navigation");
  
  if (!speechBubble || !speechText) return;
  
  // Set speech type to lowscore
  setCurrentSpeechType('lowscore');
  
  // Show speech bubble
  speechBubble.style.display = "block";
  
  // Hide navigation for auto-play
  if (navigationControls) {
    navigationControls.style.display = "none";
  }
  
  // Start low score message sequence
  displayLowScoreSequence();
}

function displayLowScoreSequence() {
  const speechText = document.getElementById("speech-text");
  if (!speechText) return;
  
  let currentIndex = 0;
  
  function typeText(text, callback) {
    speechText.textContent = "";
    let i = 0;
    
    function type() {
      if (i < text.length) {
        speechText.textContent += text.charAt(i);
        i++;
        setTimeout(type, 30); // Typing speed
      } else if (callback) {
        setTimeout(callback, 1500); // Pause before next message
      }
    }
    
    type();
  }
  
  function showNextMessage() {
    if (currentIndex < LOW_SCORE_MESSAGE.length) {
      typeText(LOW_SCORE_MESSAGE[currentIndex], () => {
        currentIndex++;
        if (currentIndex < LOW_SCORE_MESSAGE.length) {
          showNextMessage();
        } else {
          // Auto-hide after last message
          setTimeout(() => {
            hideSpeech();
          }, 3000);
        }
      });
    }
  }
  
  showNextMessage();
}