// Online button module - refactored into smaller functions
import { getSelectedCharacter } from "./characterSelection.js";
import { getCharacterSpritePath } from "../shared/character_sprites.js";

let isWaitingForOpponent = false;
let waitingInterval = null;

export function initializeOnlineButton() {
  const playOnline = document.getElementById("playOnline");

  if (!playOnline) {
    logger.debug("playOnline button not found");
    return;
  }

  logger.debug("Initializing online button...");

  setupButtonHoverEffects(playOnline);
  setupButtonClickHandler(playOnline);
}

function setupButtonHoverEffects(button) {
  button.addEventListener("mouseenter", function () {
    button.textContent = "🧋";
  });

  button.addEventListener("mouseleave", function () {
    button.textContent = "🧋 Play online";
  });
}

function setupButtonClickHandler(button) {
  button.addEventListener("click", async function () {
    logger.debug("Online button clicked");

    if (isWaitingForOpponent) {
      cancelWaitingForOpponent(button);
      return;
    }

    // Check if user is registered first
    setButtonConnectingState(button, true);

    try {
      const selectedCharacter = getSelectedCharacter();
      const response = await fetch("/api/playonline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selected_character: selectedCharacter,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // User is registered
        setButtonConnectingState(button, false);

        if (data.match_found) {
          // Match found immediately
          showVSModal(
            data.player_character,
            {
              username: data.opponent_username,
              character: data.opponent_character,
            },
            data.player_username,
          );
        } else if (data.in_queue) {
          // Added to queue, start waiting
          startWaitingForOpponent(button);
        }
      } else if (data.requires_registration) {
        // User is not registered, show registration message
        setButtonConnectingState(button, false);
        showRegistrationRequiredMessage(data.message);
      } else {
        // Other error
        setButtonConnectingState(button, false);
        showErrorAlert(data.message);
      }
    } catch (error) {
      setButtonConnectingState(button, false);
      showErrorAlert("Failed to connect to online mode. Please try again.");
    }
  });
}

function setButtonConnectingState(button, isConnecting) {
  if (isConnecting) {
    button.disabled = true;
    button.textContent = "Connecting...";
  } else {
    button.disabled = false;
    button.textContent = "🧋 Play online";
  }
}

async function connectToOnlineMode() {
  const response = await fetch("/api/playonline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  logger.debug("Online game response:", data);

  return data;
}

function handleOnlineResponse(data) {
  if (data.success) {
    handleSuccessfulConnection(data.message);
  } else {
    handleFailedConnection(data.message);
  }
}

function handleSuccessfulConnection(message) {
  showSuccessAlert("Online mode: " + message);
}

function handleFailedConnection(message) {
  const errorMessage = message || "Online mode not available yet";
  showErrorAlert(errorMessage);
}

function handleConnectionError(error) {
  logger.error("Error starting online game:", error);
  showErrorAlert("Failed to connect to online mode. Please try again.");
}

function showSuccessAlert(message) {
  alert(message);
}

function showErrorAlert(message) {
  alert(message);
}

function showRegistrationRequiredMessage(message) {
  // Create simple, responsive 8-bit style registration modal for guests
  const modalHTML = `
    <div id="registrationModal" class="guest-modal-overlay">
      <div class="guest-modal">
        <div class="guest-modal-header">
          <div class="guest-modal-title">🔒 MULTIPLAYER LOCKED</div>
        </div>
        <div class="guest-modal-content">
          <div class="guest-modal-message">
            <div class="guest-message-title">Registration Required</div>
            <div class="guest-message-text">Please register to play online</div>
          </div>
          <div class="guest-modal-buttons">
            <button id="registerNowBtn" class="guest-btn guest-btn-primary">
              REGISTER
            </button>
            <button id="closeRegistrationModal" class="guest-btn guest-btn-secondary">
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  addGuestModalStyles();

  // Close modal when clicking close or overlay
  document
    .getElementById("closeRegistrationModal")
    .addEventListener("click", closeRegistrationModal);
  
  // Handle register button - open registration modal
  document
    .getElementById("registerNowBtn")
    .addEventListener("click", function() {
      // Close the guest modal first
      closeRegistrationModal();
      // Open the registration modal
      if (typeof showAuthModal === 'function') {
        showAuthModal('register');
      } else {
        // Fallback - try to find and click the register button
        const registerButton = document.getElementById('registerButton');
        if (registerButton) {
          registerButton.click();
        }
      }
    });
    
  document
    .getElementById("registrationModal")
    .addEventListener("click", function (e) {
      if (e.target.id === "registrationModal") {
        closeRegistrationModal();
      }
    });
}

function closeRegistrationModal() {
  const modal = document.getElementById("registrationModal");
  if (modal) {
    modal.remove();
  }
  
  // Clean up styles
  const styles = document.getElementById("guestModalStyles");
  if (styles) {
    styles.remove();
  }
}

function addGuestModalStyles() {
  if (document.getElementById("guestModalStyles")) return;

  const styles = `
    <style id="guestModalStyles">
      .guest-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .guest-modal {
        background: #1a1a1a;
        border: 3px solid #00ff00;
        border-radius: 8px;
        box-shadow: 0 0 25px rgba(0, 255, 0, 0.4);
        text-align: center;
        max-width: 400px;
        width: 100%;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        overflow: hidden;
      }
      
      .guest-modal-header {
        background: #333333;
        padding: 20px;
        border-bottom: 2px solid #00ff00;
      }
      
      .guest-modal-title {
        color: #ffff00;
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 2px;
        text-shadow: 0 0 8px #ffff00;
        margin: 0;
      }
      
      .guest-modal-content {
        padding: 30px 25px;
      }
      
      .guest-modal-message {
        margin-bottom: 30px;
      }
      
      .guest-message-title {
        font-size: 20px;
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 10px;
        text-shadow: 0 0 5px #ffffff;
      }
      
      .guest-message-text {
        font-size: 14px;
        color: #00ffff;
        text-shadow: 0 0 5px #00ffff;
        line-height: 1.4;
      }
      
      .guest-modal-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .guest-btn {
        background: #000000;
        border: 2px solid;
        padding: 12px 24px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: all 0.2s ease;
        border-radius: 4px;
        min-width: 100px;
        flex: 1;
        max-width: 150px;
      }
      
      .guest-btn-primary {
        border-color: #ffff00;
        color: #ffff00;
        box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
      }
      
      .guest-btn-secondary {
        border-color: #ff00ff;
        color: #ff00ff;
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
      }
      
      .guest-btn:hover {
        transform: translateY(-2px);
        text-shadow: 0 0 10px currentColor;
        box-shadow: 0 0 15px currentColor;
      }
      
      .guest-btn:active {
        transform: translateY(0);
      }
      
      /* Mobile Responsive */
      @media (max-width: 480px) {
        .guest-modal-overlay {
          padding: 15px;
        }
        
        .guest-modal {
          max-width: none;
        }
        
        .guest-modal-header {
          padding: 15px;
        }
        
        .guest-modal-title {
          font-size: 16px;
          letter-spacing: 1px;
        }
        
        .guest-modal-content {
          padding: 25px 20px;
        }
        
        .guest-message-title {
          font-size: 18px;
        }
        
        .guest-message-text {
          font-size: 13px;
        }
        
        .guest-modal-buttons {
          flex-direction: column;
          gap: 12px;
        }
        
        .guest-btn {
          max-width: none;
          width: 100%;
          padding: 12px 20px;
          font-size: 12px;
        }
      }
      
      /* Tablet Responsive */
      @media (max-width: 768px) and (min-width: 481px) {
        .guest-modal {
          max-width: 350px;
        }
        
        .guest-modal-content {
          padding: 25px 20px;
        }
      }
    </style>
  `;

  document.head.insertAdjacentHTML("beforeend", styles);
}

function startWaitingForOpponent(button) {
  isWaitingForOpponent = true;
  let dots = "";
  let dotCount = 0;

  button.textContent = "Waiting for opponent";
  button.classList.add("waiting");

  waitingInterval = setInterval(async () => {
    dotCount = (dotCount + 1) % 4;
    dots = ".".repeat(dotCount);
    button.textContent = "Waiting for opponent" + dots;

    // Check for match every 2 seconds
    if (dotCount === 0) {
      try {
        const response = await fetch("/api/check-matchmaking");
        const data = await response.json();

        if (data.success && data.match_found) {
          // Match found! Show VS modal
          stopWaitingWithoutCancel(button);
          showVSModal(
            data.player_character,
            {
              username: data.opponent_username,
              character: data.opponent_character,
            },
            data.player_username,
          );
        } else if (!data.success || !data.in_queue) {
          // Player no longer in queue (error or removed)
          stopWaitingWithoutCancel(button);
        }
      } catch (error) {
        logger.error("Error checking matchmaking:", error);
      }
    }
  }, 500);
}

async function cancelWaitingForOpponent(button) {
  isWaitingForOpponent = false;
  if (waitingInterval) {
    clearInterval(waitingInterval);
    waitingInterval = null;
  }

  // Remove from server queue
  try {
    await fetch("/api/cancel-matchmaking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error("Error canceling matchmaking:", error);
  }

  button.textContent = "🧋 Play online";
  button.classList.remove("waiting");
}

function stopWaitingWithoutCancel(button) {
  isWaitingForOpponent = false;
  if (waitingInterval) {
    clearInterval(waitingInterval);
    waitingInterval = null;
  }

  button.textContent = "🧋 Play online";
  button.classList.remove("waiting");
}

async function foundOpponent(button) {
  await cancelWaitingForOpponent(button);

  // Get current selected character
  const selectedCharacter = getSelectedCharacter();

  try {
    // Try to join matchmaking again to get opponent info
    const response = await fetch("/api/playonline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selected_character: selectedCharacter,
      }),
    });

    const data = await response.json();

    if (data.success && data.match_found) {
      // Real match found!
      showVSModal(
        data.player_character,
        {
          username: data.opponent_username,
          character: data.opponent_character,
        },
        data.player_username,
      );
    } else {
      // Fallback - show default message
      logger.debug("No match found, player removed from queue");
    }
  } catch (error) {
    logger.error("Error getting match info:", error);
  }
}

function showVSModal(playerCharacter, opponentData, playerUsername = "You") {
  // Create modal HTML
  const modalHTML = `
    <div id="vsModal" class="vs-modal-overlay">
      <div class="vs-modal">
        <div class="vs-content">
          <div class="player-section">
            <div class="player-character">
              <img src="${getCharacterSpritePath(playerCharacter)}" alt="${playerCharacter}" class="vs-character-sprite">
            </div>
            <div class="player-username">${playerUsername}</div>
          </div>
          
          <div class="vs-section">
            <div class="vs-text">VS</div>
          </div>
          
          <div class="opponent-section">
            <div class="opponent-character">
              <img src="${getCharacterSpritePath(opponentData.character)}" alt="${opponentData.character}" class="vs-character-sprite">
            </div>
            <div class="opponent-username">${opponentData.username}</div>
          </div>
        </div>
        
        <div class="loading-section">
          <div class="loading-text">Online game is coming soon...</div>
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add CSS styles
  addVSModalStyles();

  // Auto-close modal after 5 seconds (for demo purposes)
  setTimeout(() => {
    closeVSModal();
  }, 5000);
}

function closeVSModal() {
  const modal = document.getElementById("vsModal");
  if (modal) {
    modal.remove();
  }
}

function addVSModalStyles() {
  if (document.getElementById("vsModalStyles")) return;

  const styles = `
    <style id="vsModalStyles">
      .vs-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      
      .vs-modal {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        border: 2px solid #f39c12;
      }
      
      .vs-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 40px;
        margin-bottom: 30px;
      }
      
      .player-section, .opponent-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      
      .vs-character-sprite {
        width: 80px;
        height: 80px;
        image-rendering: pixelated;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        padding: 10px;
      }
      
      .player-username, .opponent-username {
        color: #f39c12;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
      
      .vs-text {
        font-size: 36px;
        font-weight: bold;
        color: #e74c3c;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        animation: pulse 2s infinite;
      }
      
      .loading-section {
        border-top: 2px solid #34495e;
        padding-top: 20px;
      }
      
      .loading-text {
        color: #ecf0f1;
        font-size: 18px;
        margin-bottom: 10px;
      }
      
      .loading-dots {
        display: flex;
        justify-content: center;
        gap: 5px;
      }
      
      .dot {
        width: 8px;
        height: 8px;
        background-color: #f39c12;
        border-radius: 50%;
        animation: bounce 1.4s infinite both;
      }
      
      .dot:nth-child(1) { animation-delay: -0.32s; }
      .dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .btn.waiting {
        background-color: #f39c12;
        color: white;
        cursor: pointer;
      }
      
      .btn.waiting:hover {
        background-color: #e67e22;
      }
    </style>
  `;

  document.head.insertAdjacentHTML("beforeend", styles);
}
