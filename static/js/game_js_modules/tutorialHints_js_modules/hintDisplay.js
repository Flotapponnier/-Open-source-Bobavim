import { getHintForMap } from './hintContent.js';
import { setHintContainer, setCurrentMapId, getCurrentMapId, isHintCurrentlyVisible, setHintVisible, setCurrentSpeechType, clearSpeechType, getCurrentSpeechType } from './hintState.js';

export function createHintSystem(mapId) {
  // Create hint container positioned in top-right area (avoiding game content)
  const hintContainer = document.createElement("div");
  hintContainer.id = "tutorial-hint-container";
  hintContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    max-width: 350px;
    pointer-events: none;
  `;

  // Create Boba Uncle character button
  const hintButton = document.createElement("button");
  hintButton.id = "tutorial-hint-button";
  hintButton.style.cssText = `
    background: transparent;
    border: none;
    width: 60px;
    height: 60px;
    cursor: pointer;
    transition: all 0.3s ease;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: 50%;
  `;

  const hintImg = document.createElement("img");
  hintImg.src = "/static/sprites/character/boba_uncle.png";
  hintImg.alt = "Boba Uncle";
  hintImg.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid #8B4513;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  `;

  hintButton.appendChild(hintImg);

  // Create speech bubble (initially hidden)
  const speechBubble = document.createElement("div");
  speechBubble.id = "speech-bubble";
  speechBubble.style.cssText = `
    background: white;
    border: 3px solid #8B4513;
    border-radius: 20px;
    padding: 15px;
    font-size: 14px;
    line-height: 1.5;
    max-width: 300px;
    position: relative;
    display: none;
    pointer-events: auto;
    color: #2c1810;
    font-family: 'Comic Sans MS', cursive, sans-serif;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    margin-right: 10px;
  `;

  // Create speech bubble tail
  const bubbleTail = document.createElement("div");
  bubbleTail.style.cssText = `
    position: absolute;
    top: 20px;
    right: -12px;
    width: 0;
    height: 0;
    border-left: 15px solid #8B4513;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
  `;

  const bubbleTailInner = document.createElement("div");
  bubbleTailInner.style.cssText = `
    position: absolute;
    top: -7px;
    left: -12px;
    width: 0;
    height: 0;
    border-left: 12px solid white;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
  `;

  bubbleTail.appendChild(bubbleTailInner);
  speechBubble.appendChild(bubbleTail);

  // Create speech text container
  const speechText = document.createElement("div");
  speechText.id = "speech-text";
  speechText.style.cssText = `
    margin-bottom: 10px;
    min-height: 40px;
  `;

  // Create navigation controls
  const navigationControls = document.createElement("div");
  navigationControls.id = "speech-navigation";
  navigationControls.style.cssText = `
    display: none;
    align-items: center;
    justify-content: space-between;
    border-top: 2px solid #8B4513;
    padding-top: 10px;
    margin-top: 10px;
  `;

  // Progress indicator
  const progressIndicator = document.createElement("span");
  progressIndicator.id = "speech-progress";
  progressIndicator.style.cssText = `
    font-size: 12px;
    color: #8B4513;
    font-weight: bold;
  `;

  // Next button
  const nextButton = document.createElement("button");
  nextButton.id = "speech-next";
  nextButton.textContent = "→";
  nextButton.style.cssText = `
    background: #8B4513;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    transition: all 0.2s ease;
  `;

  navigationControls.appendChild(progressIndicator);
  navigationControls.appendChild(nextButton);

  speechBubble.appendChild(speechText);
  speechBubble.appendChild(navigationControls);

  // Add hover effects to Boba Uncle
  hintButton.addEventListener("mouseenter", () => {
    hintImg.style.transform = "scale(1.1)";
    hintImg.style.boxShadow = "0 6px 20px rgba(139, 69, 19, 0.5)";
  });

  hintButton.addEventListener("mouseleave", () => {
    hintImg.style.transform = "scale(1)";
    hintImg.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
  });

  // Add click handler to start speech
  hintButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startSpeech(mapId);
  });

  // Next button handler
  nextButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    nextSpeech();
  });

  // Add keyboard support for faster interaction - use capture phase to get priority
  document.addEventListener("keydown", handleSpeechKeyboard, true);

  // Store the keyboard handler for cleanup
  hintContainer.setAttribute("data-keyboard-added", "true");

  // Next button hover effect
  nextButton.addEventListener("mouseenter", () => {
    nextButton.style.background = "#A0522D";
    nextButton.style.transform = "scale(1.1)";
  });

  nextButton.addEventListener("mouseleave", () => {
    nextButton.style.background = "#8B4513";
    nextButton.style.transform = "scale(1)";
  });

  // Append elements to container
  hintContainer.appendChild(speechBubble);
  hintContainer.appendChild(hintButton);

  // Add to game board area (not header)
  const gameBoard = document.querySelector(".game-board");
  if (gameBoard) {
    gameBoard.style.position = "relative"; // Ensure relative positioning for absolute child
    gameBoard.appendChild(hintContainer);
  }

  setHintContainer(hintContainer);
  setCurrentMapId(mapId);
}

// Speech system variables
let currentSpeechIndex = 0;
let currentMapSpeech = [];
let isSpeaking = false;
let isTyping = false;
let typewriterInterval = null;

export function startSpeech(mapId, speechType = 'tutorial') {
  // Stop any current speech before starting new one
  if (getCurrentSpeechType()) {
    hideSpeech();
  }
  
  const speechTexts = getHintForMap(mapId);
  if (!speechTexts || !Array.isArray(speechTexts)) return;

  currentMapSpeech = speechTexts;
  currentSpeechIndex = 0;
  isSpeaking = true;
  
  // Track what type of speech is active
  setCurrentSpeechType(speechType);

  const speechBubble = document.getElementById("speech-bubble");
  const speechText = document.getElementById("speech-text");
  const navigationControls = document.getElementById("speech-navigation");
  const progressIndicator = document.getElementById("speech-progress");

  if (!speechBubble || !speechText) return;

  // Show speech bubble
  speechBubble.style.display = "block";
  
  // Display first speech
  displayCurrentSpeech();
  
  // Show navigation if more than one speech
  if (currentMapSpeech.length > 1) {
    navigationControls.style.display = "flex";
    updateProgress();
  }

  setHintVisible(true);
}

export function displayCurrentSpeech() {
  const speechText = document.getElementById("speech-text");
  const navigationControls = document.getElementById("speech-navigation");
  
  if (!speechText || !currentMapSpeech[currentSpeechIndex]) return;

  // Clear previous text and stop any ongoing typing
  stopTypewriter();
  speechText.textContent = "";
  
  // Hide navigation during typing
  if (navigationControls) {
    navigationControls.style.display = "none";
  }

  // Start typewriter effect
  startTypewriter(currentMapSpeech[currentSpeechIndex], speechText, () => {
    // Show navigation after typing is complete
    if (currentMapSpeech.length > 1 && navigationControls) {
      navigationControls.style.display = "flex";
    }
    updateProgress();
  });
}

function startTypewriter(text, element, onComplete) {
  if (!text || !element) return;
  
  isTyping = true;
  let charIndex = 0;
  const typingSpeed = 30; // milliseconds per character
  
  typewriterInterval = setInterval(() => {
    if (charIndex < text.length) {
      element.textContent += text[charIndex];
      charIndex++;
    } else {
      stopTypewriter();
      if (onComplete) {
        onComplete();
      }
    }
  }, typingSpeed);
}

function stopTypewriter() {
  if (typewriterInterval) {
    clearInterval(typewriterInterval);
    typewriterInterval = null;
  }
  isTyping = false;
}

export function nextSpeech() {
  // If currently typing, skip to end of current text
  if (isTyping) {
    stopTypewriter();
    const speechText = document.getElementById("speech-text");
    const navigationControls = document.getElementById("speech-navigation");
    
    if (speechText && currentMapSpeech[currentSpeechIndex]) {
      speechText.textContent = currentMapSpeech[currentSpeechIndex];
    }
    
    // Show navigation after skipping
    if (currentMapSpeech.length > 1 && navigationControls) {
      navigationControls.style.display = "flex";
    }
    updateProgress();
    return;
  }

  if (!isSpeaking || currentSpeechIndex >= currentMapSpeech.length - 1) {
    // End of speech - hide everything
    hideSpeech();
    return;
  }

  currentSpeechIndex++;
  displayCurrentSpeech();
}

export function hideSpeech() {
  const speechBubble = document.getElementById("speech-bubble");
  const navigationControls = document.getElementById("speech-navigation");
  
  // Stop any ongoing typewriter effect
  stopTypewriter();
  
  if (speechBubble) {
    speechBubble.style.display = "none";
  }
  if (navigationControls) {
    navigationControls.style.display = "none";
  }

  // Clean up keyboard event listener
  const hintContainer = document.getElementById("tutorial-hint-container");
  if (hintContainer && hintContainer.getAttribute("data-keyboard-added")) {
    document.removeEventListener("keydown", handleSpeechKeyboard, true);
    hintContainer.removeAttribute("data-keyboard-added");
  }

  currentSpeechIndex = 0;
  currentMapSpeech = [];
  isSpeaking = false;
  setHintVisible(false);
  clearSpeechType();
}

function updateProgress() {
  const progressIndicator = document.getElementById("speech-progress");
  const nextButton = document.getElementById("speech-next");
  
  if (!progressIndicator || !nextButton) return;

  const current = currentSpeechIndex + 1;
  const total = currentMapSpeech.length;
  
  progressIndicator.textContent = `${current}/${total}`;
  
  // Update button based on typing state and position
  if (isTyping) {
    nextButton.textContent = "⏭";
    nextButton.title = "Skip typing";
  } else if (current === total) {
    nextButton.textContent = "✓";
    nextButton.title = "Close";
  } else {
    nextButton.textContent = "→";
    nextButton.title = "Next";
  }
}

function handleSpeechKeyboard(e) {
  // Only handle keyboard events when speech bubble is visible
  if (!isSpeaking) return;
  
  // Space or Enter to advance/skip
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    nextSpeech();
    return;
  }
  
  // Escape to close
  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    hideSpeech();
    return;
  }
}

// Legacy function for backward compatibility
export function toggleHint() {
  const currentSpeech = getCurrentSpeechType();
  const mapId = getCurrentMapId();
  
  if (currentSpeech === 'lowscore') {
    // If low score message is playing, stop it and start tutorial
    hideSpeech();
    if (mapId) {
      startSpeech(mapId, 'tutorial');
    }
  } else if (currentSpeech === 'tutorial') {
    // If tutorial is playing, stop it
    hideSpeech();
  } else if (mapId && !isSpeaking) {
    // No speech playing, start tutorial
    startSpeech(mapId, 'tutorial');
  }
}