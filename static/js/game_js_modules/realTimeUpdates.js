import { API_ENDPOINTS } from "./constants_js_modules/api.js";
import { handleGameFailure } from "./movement_js_modules/movementHandlers.js";

let gameStatePoller = null;
let lastGameMapState = null;

export function startGameStatePolling() {
  // Don't start polling if already active
  if (gameStatePoller) {
    return;
  }

  logger.debug("Starting real-time game state polling...");
  
  // Poll every 0.5 seconds to quickly show pearl mold position updates
  gameStatePoller = setInterval(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GAME_STATE);
      const gameState = await response.json();
      
      if (gameState.success) {
        // Check if game map has changed by comparing with last known state
        const currentMapState = JSON.stringify(gameState.game_map);
        
        if (lastGameMapState !== currentMapState) {
          // Game map has changed, update the display
          window.displayModule.updateGameDisplay(gameState.game_map);
          lastGameMapState = currentMapState;
          logger.debug("Game map updated due to real-time changes");
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
  }, 500);
}

export function stopGameStatePolling() {
  if (gameStatePoller) {
    logger.debug("Stopping game state polling");
    clearInterval(gameStatePoller);
    gameStatePoller = null;
    lastGameMapState = null;
  }
}

export function initializeRealTimeUpdates() {
  // Initialize the last game map state
  lastGameMapState = null;
  
  // Start polling when the module is initialized
  startGameStatePolling();
  
  // Stop polling when the page is about to unload
  window.addEventListener('beforeunload', stopGameStatePolling);
  
  logger.debug("Real-time updates module initialized");
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