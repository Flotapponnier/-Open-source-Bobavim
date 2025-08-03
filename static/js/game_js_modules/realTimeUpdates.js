import { API_ENDPOINTS } from "./constants_js_modules/api.js";
import { handleGameFailure } from "./movement_js_modules/movementHandlers.js";

let gameStatePoller = null;
let lastGameMapState = null;
let lastMovementTime = 0;
let adaptivePollingInterval = 2000; // Start with 2 seconds
let currentPollingMode = 'idle'; // 'idle', 'active', 'critical'
let hasPearlMold = false; // Track if game has moving pearl mold
let consecutiveEmptyPolls = 0; // Track polls with no changes

export function startGameStatePolling() {
  // Don't start polling if already active
  if (gameStatePoller) {
    return;
  }

  logger.debug("Starting optimized real-time game state polling...");
  
  // Start with adaptive polling
  scheduleNextPoll();
}

function scheduleNextPoll() {
  if (gameStatePoller) {
    clearTimeout(gameStatePoller);
  }
  
  gameStatePoller = setTimeout(async () => {
    await pollGameState();
    
    // Schedule next poll if still active
    if (gameStatePoller) {
      updatePollingStrategy();
      scheduleNextPoll();
    }
  }, adaptivePollingInterval);
}

async function pollGameState() {
  try {
    // Skip polling if client predictions are active to prevent interference
    if (window.playerMovement && window.playerMovement.isPredictionActive && 
        window.playerMovement.isPredictionActive()) {
      consecutiveEmptyPolls++;
      return;
    }

    const response = await fetch(API_ENDPOINTS.GAME_STATE);
    const gameState = await response.json();
    
    if (gameState.success) {
      // Check if game map has changed by comparing with last known state
      const currentMapState = JSON.stringify(gameState.game_map);
      
      // Detect pearl mold presence (value 4 in game map)
      if (gameState.game_map) {
        hasPearlMold = gameState.game_map.some(row => row.includes(4));
      }
      
      if (lastGameMapState !== currentMapState) {
        // Only update if no active predictions to avoid rubber banding
        if (!window.playerMovement || !window.playerMovement.isPredictionActive || 
            !window.playerMovement.isPredictionActive()) {
          window.displayModule.updateGameDisplay(gameState.game_map);
          lastGameMapState = currentMapState;
          logger.debug("Game map updated due to real-time changes");
          
          // Switch to critical mode when map changes detected
          currentPollingMode = 'critical';
          consecutiveEmptyPolls = 0;
        }
      } else {
        consecutiveEmptyPolls++;
      }
      
      // Check for game failure due to pearl mold collision or other reasons
      if (gameState.is_completed || gameState.game_failed) {
        logger.debug("Game ended detected, stopping polling");
        stopGameStatePolling();
        
        // If it's a failure, handle it
        if (gameState.game_failed) {
          handleGameFailure(gameState);
        }
      }
    } else if (gameState.error === "Invalid or expired game session") {
      // Session expired, stop polling
      logger.debug("Game session expired, stopping polling");
      stopGameStatePolling();
    }
  } catch (error) {
    logger.error("Error polling game state:", error);
    // Don't stop polling on network errors, just log them
  }
}

function updatePollingStrategy() {
  const timeSinceLastMovement = Date.now() - lastMovementTime;
  
  // Check if predictions are active to reduce polling interference
  const predictionActive = window.playerMovement && window.playerMovement.isPredictionActive && 
                          window.playerMovement.isPredictionActive();
  
  // Adaptive polling intervals based on activity, criticality, and pearl mold presence
  if (currentPollingMode === 'critical') {
    // Critical mode: fast polling but respect predictions
    adaptivePollingInterval = predictionActive ? 1000 : 500;
    if (timeSinceLastMovement > 10000) {
      currentPollingMode = 'active';
    }
  } else if (currentPollingMode === 'active') {
    // Active mode: medium polling when recently active
    const baseInterval = hasPearlMold ? 1200 : 2000;
    adaptivePollingInterval = predictionActive ? baseInterval * 1.5 : baseInterval;
    if (timeSinceLastMovement > 30000) {
      currentPollingMode = 'idle';
    }
  } else {
    // Idle mode: adaptive polling based on game state
    let baseInterval;
    if (hasPearlMold) {
      baseInterval = 2500;
    } else if (consecutiveEmptyPolls > 10) {
      baseInterval = 5000;
    } else {
      baseInterval = 3000;
    }
    
    // Increase interval if predictions are active
    adaptivePollingInterval = predictionActive ? baseInterval * 2 : baseInterval;
  }
}

// Called by movement system to indicate recent activity
export function notifyMovementActivity() {
  lastMovementTime = Date.now();
  
  // Switch to active mode on movement
  if (currentPollingMode === 'idle') {
    currentPollingMode = 'active';
    logger.debug("Switched to active polling mode due to movement");
  }
}

export function stopGameStatePolling() {
  if (gameStatePoller) {
    logger.debug("Stopping game state polling");
    clearTimeout(gameStatePoller);
    gameStatePoller = null;
    lastGameMapState = null;
    currentPollingMode = 'idle';
    adaptivePollingInterval = 2000;
    hasPearlMold = false;
    consecutiveEmptyPolls = 0;
  }
}

export function initializeRealTimeUpdates() {
  // Initialize state
  lastGameMapState = null;
  lastMovementTime = Date.now();
  currentPollingMode = 'active'; // Start in active mode
  adaptivePollingInterval = 1500;
  hasPearlMold = false;
  consecutiveEmptyPolls = 0;
  
  // Start polling when the module is initialized
  startGameStatePolling();
  
  // Stop polling when the page is about to unload
  window.addEventListener('beforeunload', stopGameStatePolling);
  
  logger.debug("Optimized real-time updates module initialized");
}

// Force immediate game state refresh
export async function forceGameStateRefresh() {
  try {
    const response = await fetch(API_ENDPOINTS.GAME_STATE);
    const gameState = await response.json();
    
    if (gameState.success) {
      // Update the display immediately
      window.displayModule.updateGameDisplay(gameState.game_map);
      lastGameMapState = JSON.stringify(gameState.game_map);
      logger.debug("Forced game state refresh completed");
      return true;
    }
  } catch (error) {
    logger.error("Error in forced game state refresh:", error);
  }
  return false;
}

// Export polling state for debugging
export function isPollingActive() {
  return gameStatePoller !== null;
}