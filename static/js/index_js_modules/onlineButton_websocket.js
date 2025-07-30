// WebSocket-based online button module
import { getSelectedCharacter } from "./characterSelection.js";
import { getCharacterSpritePath } from "../shared/character_sprites.js";

let matchmakingSocket = null;
let isConnected = false;
let isWaitingForOpponent = false;
let currentMatchID = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let currentMatchData = null;

export function initializeOnlineButton() {
  const playOnline = document.getElementById("playOnline");

  if (!playOnline) {
    logger.debug("playOnline button not found");
    return;
  }

  logger.debug("Initializing WebSocket online button...");

  setupButtonHoverEffects(playOnline);
  setupButtonClickHandler(playOnline);
}

function setupButtonHoverEffects(button) {
  button.addEventListener("mouseenter", function () {
    if (!isWaitingForOpponent) {
      button.textContent = "🧋";
    } else {
      button.textContent = "❌ Cancel search";
    }
  });

  button.addEventListener("mouseleave", function () {
    if (!isWaitingForOpponent) {
      button.textContent = "🧋 Play online";
    } else {
      button.textContent = "Finding opponent...";
    }
  });
}

function setupButtonClickHandler(button) {
  button.addEventListener("click", async function () {
    logger.debug("Online button clicked");

    if (isWaitingForOpponent) {
      // Cancel matchmaking
      await cancelMatchmaking(button);
      return;
    }

    // Start matchmaking
    await startMatchmaking(button);
  });
}

async function startMatchmaking(button) {
  try {
    // Check if user is registered first
    setButtonState(button, "connecting");

    const response = await fetch("/api/playonline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selected_character: getSelectedCharacter(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      // User is registered, connect to WebSocket
      await connectToMatchmaking(button, data.websocket_url);
    } else if (data.requires_registration) {
      // User is not registered
      setButtonState(button, "idle");
      showRegistrationRequiredMessage(data.message);
    } else {
      // Other error
      setButtonState(button, "idle");
      showErrorAlert(data.message);
    }
  } catch (error) {
    logger.error("Error starting matchmaking:", error);
    setButtonState(button, "idle");
    showErrorAlert("Failed to connect to matchmaking. Please try again.");
  }
}

async function connectToMatchmaking(button, websocketUrl) {
  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${websocketUrl}`;
    
    logger.debug("Connecting to WebSocket:", wsUrl);

    matchmakingSocket = new WebSocket(wsUrl);
    
    matchmakingSocket.onopen = function(event) {
      logger.debug("WebSocket connected");
      isConnected = true;
      setButtonState(button, "connected");
      
      // Start heartbeat
      startHeartbeat();
      
      // Join matchmaking queue via HTTP endpoint
      joinQueueViaHTTP();
    };

    matchmakingSocket.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message, button);
      } catch (error) {
        logger.error("Error parsing WebSocket message:", error);
      }
    };

    matchmakingSocket.onclose = function(event) {
      logger.debug("WebSocket disconnected:", event.code, event.reason);
      isConnected = false;
      stopHeartbeat();
      
      if (isWaitingForOpponent) {
        setButtonState(button, "idle");
        showErrorAlert("Connection lost. Please try again.");
        isWaitingForOpponent = false;
      }
      
      // Attempt to reconnect if not intentionally closed
      if (event.code !== 1000 && isWaitingForOpponent) {
        scheduleReconnect(button);
      }
    };

    matchmakingSocket.onerror = function(error) {
      logger.error("WebSocket error:", error);
      setButtonState(button, "idle");
      showErrorAlert("Connection error. Please try again.");
    };

  } catch (error) {
    logger.error("Error connecting to WebSocket:", error);
    setButtonState(button, "idle");
    showErrorAlert("Failed to connect to matchmaking. Please try again.");
  }
}

function handleWebSocketMessage(message, button) {
  logger.debug("Received WebSocket message:", message);

  switch (message.type) {
    case "queue_joined":
      setButtonState(button, "searching");
      isWaitingForOpponent = true;
      break;

    case "queue_left":
      setButtonState(button, "idle");
      isWaitingForOpponent = false;
      break;

    case "queue_timeout":
      setButtonState(button, "idle");
      isWaitingForOpponent = false;
      showErrorAlert("Matchmaking timeout. No opponent found after 45 seconds.");
      disconnect();
      break;

    case "match_found":
      currentMatchID = message.data.match_id;
      currentMatchData = message.data;
      setButtonState(button, "match_found");
      showMatchFoundModal(message.data, button);
      break;

    case "match_accepted":
      setButtonState(button, "waiting_accept");
      // The match_accepted message is sent to the accepting player (current user)
      // So this means WE accepted, not the opponent
      updatePlayerStatus("accepted");
      hideMatchActions();
      break;

    case "opponent_accepted":
      // The opponent has accepted the match
      updateOpponentStatus("accepted");
      break;

    case "match_rejected":
      setButtonState(button, "idle");
      isWaitingForOpponent = false;
      currentMatchID = null;
      updatePlayerStatus("rejected");
      hideMatchActions();
      
      // Show rejection message and close modal after delay
      setTimeout(() => {
        closeAllModals();
        showErrorAlert(message.message);
        disconnect();
      }, 2000);
      break;

    case "opponent_rejected":
      setButtonState(button, "idle");
      isWaitingForOpponent = false;
      currentMatchID = null;
      updateOpponentStatus("rejected");
      
      // Show rejection message and close modal after delay
      setTimeout(() => {
        closeAllModals();
        showErrorAlert(message.message);
        disconnect();
      }, 2000);
      break;

    case "match_started":
      setButtonState(button, "match_started");
      isWaitingForOpponent = false;
      currentMatchID = null;
      
      // Start countdown in the modal
      startMatchCountdown(message.data);
      
      disconnect();
      break;

    case "match_cancelled":
      setButtonState(button, "idle");
      isWaitingForOpponent = false;
      currentMatchID = null;
      closeAllModals();
      showErrorAlert(message.message);
      disconnect();
      break;

    case "error":
      logger.error("Matchmaking error:", message.message);
      setButtonState(button, "idle");
      showErrorAlert(message.message);
      break;

    case "heartbeat":
      // Heartbeat received, connection is healthy
      break;

    default:
      logger.warn("Unknown message type:", message.type);
  }
}

async function joinQueueViaHTTP() {
  try {
    const response = await fetch("/api/matchmaking/queue/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selected_character: getSelectedCharacter()
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      logger.debug("Successfully joined matchmaking queue");
    } else {
      logger.error("Failed to join queue:", data.error);
      showErrorAlert(data.error || "Failed to join matchmaking queue");
    }
  } catch (error) {
    logger.error("Error joining queue:", error);
    showErrorAlert("Failed to join matchmaking queue");
  }
}

function joinQueue() {
  // This method is kept for compatibility but now uses HTTP endpoint
  joinQueueViaHTTP();
}

async function leaveQueue() {
  try {
    const response = await fetch("/api/matchmaking/queue/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (data.success) {
      logger.debug("Successfully left matchmaking queue");
    } else {
      logger.error("Failed to leave queue:", data.error);
    }
  } catch (error) {
    logger.error("Error leaving queue:", error);
  }
}

async function acceptMatch() {
  if (!currentMatchID) {
    logger.error("No current match ID");
    return;
  }

  try {
    const response = await fetch("/api/matchmaking/match/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_id: currentMatchID,
        accepted: true
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      logger.debug("Successfully accepted match");
    } else {
      logger.error("Failed to accept match:", data.error);
      showErrorAlert(data.error || "Failed to accept match");
    }
  } catch (error) {
    logger.error("Error accepting match:", error);
    showErrorAlert("Failed to accept match");
  }
}

async function rejectMatch() {
  if (!currentMatchID) {
    logger.error("No current match ID");
    return;
  }

  try {
    const response = await fetch("/api/matchmaking/match/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_id: currentMatchID,
        accepted: false
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      logger.debug("Successfully rejected match");
    } else {
      logger.error("Failed to reject match:", data.error);
    }
  } catch (error) {
    logger.error("Error rejecting match:", error);
  }
}

async function cancelMatchmaking(button) {
  try {
    leaveQueue();
    disconnect();
    setButtonState(button, "idle");
    isWaitingForOpponent = false;
    currentMatchID = null;
    closeAllModals();
  } catch (error) {
    logger.error("Error canceling matchmaking:", error);
  }
}

function disconnect() {
  if (matchmakingSocket) {
    matchmakingSocket.close(1000, "User disconnected");
    matchmakingSocket = null;
  }
  isConnected = false;
  stopHeartbeat();
  clearReconnectTimer();
}

function scheduleReconnect(button) {
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    if (isWaitingForOpponent) {
      logger.debug("Attempting to reconnect...");
      connectToMatchmaking(button, "/api/matchmaking/ws");
    }
  }, 3000);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (matchmakingSocket && matchmakingSocket.readyState === WebSocket.OPEN) {
      matchmakingSocket.send(JSON.stringify({ type: "heartbeat" }));
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function setButtonState(button, state) {
  button.classList.remove("idle", "connecting", "connected", "searching", "match_found", "waiting_accept", "match_started");
  button.classList.add(state);

  switch (state) {
    case "idle":
      button.disabled = false;
      button.textContent = "🧋 Play online";
      break;
    case "connecting":
      button.disabled = true;
      button.textContent = "Connecting...";
      break;
    case "connected":
      button.disabled = true;
      button.textContent = "Joining queue...";
      break;
    case "searching":
      button.disabled = false;
      button.textContent = "Finding opponent...";
      break;
    case "match_found":
      button.disabled = true;
      button.textContent = "Match found!";
      break;
    case "waiting_accept":
      button.disabled = true;
      button.textContent = "Waiting for opponent...";
      break;
    case "match_started":
      button.disabled = true;
      button.textContent = "Match starting...";
      break;
  }
}

function showMatchFoundModal(matchData, button) {
  const modalHTML = `
    <div id="matchFoundModal" class="match-modal-overlay">
      <div class="match-modal">
        <div class="match-header">
          <h2>Match Found!</h2>
          <div class="match-timer">
            <span id="acceptTimer">30</span>s
          </div>
        </div>
        
        <div class="match-vs-content">
          <div class="player-section">
            <div class="player-character">
              <img src="${getCharacterSpritePath(matchData.player_character)}" alt="${matchData.player_character}" class="match-character-sprite">
            </div>
            <div class="player-username">${matchData.player_username}</div>
            <div class="player-status" id="playerStatus">
              <span class="status-icon">⏳</span>
              <span class="status-text">Waiting...</span>
            </div>
          </div>
          
          <div class="vs-section">
            <div class="vs-text">VS</div>
          </div>
          
          <div class="opponent-section">
            <div class="opponent-character">
              <img src="${getCharacterSpritePath(matchData.opponent_character)}" alt="${matchData.opponent_character}" class="match-character-sprite">
            </div>
            <div class="opponent-username">${matchData.opponent_username}</div>
            <div class="opponent-status" id="opponentStatus">
              <span class="status-icon">⏳</span>
              <span class="status-text">Waiting...</span>
            </div>
          </div>
        </div>
        
        <div class="match-actions" id="matchActions">
          <button id="acceptMatch" class="btn accept-btn">Accept</button>
          <button id="rejectMatch" class="btn reject-btn">Reject</button>
        </div>
        
        <div class="countdown-section" id="countdownSection" style="display: none;">
          <div class="countdown-text">Get ready! Game starts in</div>
          <div class="countdown-number" id="countdownNumber">3</div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  addMatchModalStyles();

  // Start countdown timer
  let timeLeft = Math.floor(matchData.accept_timeout_ms / 1000);
  const timerElement = document.getElementById("acceptTimer");
  
  const countdownTimer = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      closeMatchFoundModal();
      // Auto-reject if no response
      rejectMatch();
    }
  }, 1000);

  // Set up button handlers
  document.getElementById("acceptMatch").addEventListener("click", function() {
    clearInterval(countdownTimer);
    // Update UI to show we accepted and hide actions
    updatePlayerStatus("accepted");
    hideMatchActions();
    acceptMatch();
  });

  document.getElementById("rejectMatch").addEventListener("click", function() {
    clearInterval(countdownTimer);
    // Update UI to show we rejected and hide actions
    updatePlayerStatus("rejected");
    hideMatchActions();
    rejectMatch();
  });
}

function updatePlayerStatus(status) {
  const playerStatusElement = document.getElementById("playerStatus");
  if (playerStatusElement) {
    const statusIcon = playerStatusElement.querySelector(".status-icon");
    const statusText = playerStatusElement.querySelector(".status-text");
    
    if (status === "accepted") {
      statusIcon.textContent = "✅";
      statusText.textContent = "Accepted";
      playerStatusElement.classList.add("accepted");
    } else if (status === "rejected") {
      statusIcon.textContent = "❌";
      statusText.textContent = "Rejected";
      playerStatusElement.classList.add("rejected");
    }
  }
}

function updateOpponentStatus(status) {
  const opponentStatusElement = document.getElementById("opponentStatus");
  if (opponentStatusElement) {
    const statusIcon = opponentStatusElement.querySelector(".status-icon");
    const statusText = opponentStatusElement.querySelector(".status-text");
    
    if (status === "accepted") {
      statusIcon.textContent = "✅";
      statusText.textContent = "Accepted";
      opponentStatusElement.classList.add("accepted");
      
      // Check if both players have accepted
      const playerStatusElement = document.getElementById("playerStatus");
      if (playerStatusElement && playerStatusElement.classList.contains("accepted")) {
        // Both players have accepted, but we'll wait for the "match_started" message
        // to trigger the countdown since the backend handles the timing
      }
    } else if (status === "rejected") {
      statusIcon.textContent = "❌";
      statusText.textContent = "Rejected";
      opponentStatusElement.classList.add("rejected");
      
      // Show rejection message
      const matchModal = document.querySelector(".match-modal");
      if (matchModal) {
        const rejectionMessage = document.createElement("div");
        rejectionMessage.className = "rejection-message";
        rejectionMessage.innerHTML = `
          <div class="rejection-icon">❌</div>
          <div class="rejection-text">Game refused by the other player</div>
        `;
        matchModal.appendChild(rejectionMessage);
      }
    }
  }
}

function hideMatchActions() {
  const actionsElement = document.getElementById("matchActions");
  if (actionsElement) {
    actionsElement.style.display = "none";
  }
}

function startMatchCountdown(matchData) {
  const countdownSection = document.getElementById("countdownSection");
  const countdownNumber = document.getElementById("countdownNumber");
  
  if (countdownSection && countdownNumber) {
    countdownSection.style.display = "block";
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      if (count > 0) {
        countdownNumber.textContent = count;
        count--;
      } else {
        clearInterval(countdownInterval);
        // Redirect to game
        window.location.href = "/play?multiplayer=true&match_id=" + matchData.match_id;
      }
    }, 1000);
  }
}


function closeMatchFoundModal() {
  const modal = document.getElementById("matchFoundModal");
  if (modal) {
    modal.remove();
  }
}


function closeAllModals() {
  closeMatchFoundModal();
  closeRegistrationModal();
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

function showErrorAlert(message) {
  // You can replace this with a nicer modal if desired
  alert(message);
}

function addMatchModalStyles() {
  // Styles now loaded from CSS file: /static/css/index_css_modules/match_modal.css
  // This function is kept for backward compatibility but no longer needed
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

// Cleanup function for when the page is unloaded
window.addEventListener("beforeunload", function() {
  if (matchmakingSocket) {
    disconnect();
  }
});