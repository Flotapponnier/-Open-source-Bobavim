import { 
  handleSuccessfulMove, 
  handleBlockedMove,
  handleGameCompletion,
  handlePearlCollection
} from './movementHandlers.js';
import { predictMovement } from './vimMovementPredictor.js';
import { API_ENDPOINTS } from '../constants_js_modules/api.js';

let movePending = false;
let lastMoveTime = 0;
const MOVE_COOLDOWN = 75; // Increased to 75ms to better match server rate limiting

// Optimized prediction state
let activePredictions = new Set();
let serverSyncPending = false;

// Client-side game state for prediction
let clientGameState = {
  currentRow: 0,
  currentCol: 0,
  preferredColumn: 0,
  gameMap: [],
  textGrid: [],
  isInitialized: false
};

// Extract initial game state from DOM (embedded by server template)
function extractInitialGameStateFromDOM() {
  try {
    const keys = document.querySelectorAll('.key');
    if (keys.length === 0) {
      logger.debug("No game keys found in DOM");
      return null;
    }
    
    let maxRow = 0, maxCol = 0;
    let playerPos = { row: 0, col: 0 };
    
    // First pass: determine dimensions and find player
    keys.forEach(key => {
      const row = parseInt(key.dataset.row);
      const col = parseInt(key.dataset.col);
      const mapValue = parseInt(key.dataset.map);
      
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
      
      if (mapValue === 1) { // PLAYER
        playerPos = { row, col };
      }
    });
    
    // Create game map and text grid
    const gameMap = Array(maxRow + 1).fill().map(() => Array(maxCol + 1).fill(0));
    const textGrid = Array(maxRow + 1).fill().map(() => Array(maxCol + 1).fill(' '));
    
    // Second pass: populate grids
    keys.forEach(key => {
      const row = parseInt(key.dataset.row);
      const col = parseInt(key.dataset.col);
      const mapValue = parseInt(key.dataset.map);
      const letter = key.dataset.letter || ' ';
      
      gameMap[row][col] = mapValue;
      textGrid[row][col] = letter;
    });
    
    return {
      player_pos: playerPos,
      game_map: gameMap,
      text_grid: textGrid
    };
  } catch (error) {
    logger.error("Error extracting initial game state from DOM:", error);
    return null;
  }
}

// Initialize client game state from initial server data or DOM
export function initializeClientGameState(initialGameData = null) {
  let gameData = initialGameData;
  
  // If no data provided, try to extract from DOM
  if (!gameData) {
    gameData = extractInitialGameStateFromDOM();
  }
  
  if (gameData) {
    updateClientGameState(gameData);
    
    // Clean up any orphaned player sprites on initialization
    if (window.displayModule && window.displayModule.cleanupOrphanedPlayerSprites && gameData.game_map) {
      window.displayModule.cleanupOrphanedPlayerSprites(gameData.game_map);
    }
    
    logger.debug("Client game state initialized successfully");
    return true;
  } else {
    logger.debug("Failed to initialize client game state");
    return false;
  }
}

export async function movePlayer(direction, count = 1, hasExplicitCount = false) {
  if (window.gameCompleted) {
    logger.debug("Game is completed, movement disabled");
    return;
  }

  if (movePending) {
    logger.debug("Move already pending, ignoring");
    return;
  }

  // Notify real-time updates system about movement activity
  if (window.realTimeUpdatesModule && window.realTimeUpdatesModule.notifyMovementActivity) {
    window.realTimeUpdatesModule.notifyMovementActivity();
  }

  // Disable responsive scaling after first move to prevent jumps during gameplay
  if (window.responsiveScaling && window.responsiveScaling.disableScaling) {
    window.responsiveScaling.disableScaling();
  }

  const now = Date.now();
  
  // Simplified cooldown - more optimistic
  const requiredCooldown = count > 1 ? 30 : 50; // Reduced cooldowns
  
  if (now - lastMoveTime < requiredCooldown) {
    return;
  }

  movePending = true;
  lastMoveTime = now;

  try {
    // Get current game state for prediction
    const currentState = getCurrentGameState();
    if (!currentState) {
      logger.debug("Cannot get current game state for prediction, falling back to server-only");
      return await movePlayerServerOnly(direction, count, hasExplicitCount);
    }


    // Perform client-side prediction
    const prediction = predictMovement(
      direction,
      currentState.currentRow,
      currentState.currentCol,
      currentState.gameMap,
      currentState.textGrid,
      currentState.preferredColumn,
      count,
      hasExplicitCount
    );

    if (prediction.success && prediction.finalPosition) {
      // Generate prediction ID and track it
      const predictionId = `pred_${Date.now()}_${Math.random()}`;
      activePredictions.add(predictionId);
      
      // Immediately update UI with predicted position
      updateUIWithPrediction(prediction.finalPosition, currentState.gameMap);
      
      // Start optimized server validation
      serverSyncPending = true;
      validatePredictionOptimized(direction, count, prediction, hasExplicitCount, predictionId);
    } else {
      // Prediction failed (movement blocked), still send to server for authoritative response
      logger.debug("Client prediction blocked, checking with server");
      return await movePlayerServerOnly(direction, count, hasExplicitCount);
    }
  } catch (error) {
    logger.error("Error in movement prediction:", error);
    // Fall back to server-only movement
    return await movePlayerServerOnly(direction, count, hasExplicitCount);
  } finally {
    movePending = false;
  }
}

// Server-only movement (fallback)
async function movePlayerServerOnly(direction, count, hasExplicitCount) {
  try {
    const response = await fetch(API_ENDPOINTS.MOVE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        direction: direction,
        count: count,
        has_explicit_count: hasExplicitCount,
      }),
    });

    const result = await response.json();

    // Always update client state from server response
    updateClientGameState(result);
    
    if (result.success) {
      handleSuccessfulMove(result, direction);
    } else {
      // Special handling for G commands - always treat as successful
      if (direction === 'G') {
        // Update display even when blocked
        window.displayModule.updateGameDisplay(result.game_map);
        window.displayModule.updateScore(result.score);
        // Show success feedback for G commands even when blocked
        window.feedbackModule.showMovementFeedback(direction, count, hasExplicitCount);
      } else {
        handleBlockedMove(result, direction);
      }
    }
  } catch (error) {
    logger.error("Error moving player:", error);
  }
}

// Optimized prediction validation
async function validatePredictionOptimized(direction, count, prediction, hasExplicitCount, predictionId) {
  try {
    const response = await fetch(API_ENDPOINTS.MOVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: direction,
        count: count,
        has_explicit_count: hasExplicitCount,
      }),
    });

    const result = await response.json();
    
    // Remove prediction from active set
    activePredictions.delete(predictionId);
    
    if (!serverSyncPending) return;
    
    if (result.success && prediction.success) {
      const serverPos = result.player_pos;
      const predictedPos = prediction.finalPosition;
      
      if (serverPos.row === predictedPos.newRow && serverPos.col === predictedPos.newCol) {
        // Perfect match - only sync non-position data
        handleServerSyncSuccess(result, direction);
      } else {
        // Position mismatch - trust server but minimize visual disruption
        updateClientGameState(result);
        if (window.displayModule?.updateGameDisplay) {
          window.displayModule.updateGameDisplay(result.game_map);
        }
        handleServerSyncSuccess(result, direction);
      }
    } else if (!result.success) {
      // Server blocked - revert to server state
      updateClientGameState(result);
      if (result.success) {
        handleSuccessfulMove(result, direction);
      } else {
        handleBlockedMove(result, direction);
      }
    }
  } catch (error) {
    logger.error("Prediction validation error:", error);
    activePredictions.delete(predictionId);
  } finally {
    serverSyncPending = false;
  }
}

// Get current game state for prediction
function getCurrentGameState() {
  try {
    // If client state is not initialized yet, return null to fall back to server-only
    if (!clientGameState.isInitialized) {
      logger.debug("Client game state not initialized, falling back to server-only movement");
      return null;
    }

    return {
      currentRow: clientGameState.currentRow,
      currentCol: clientGameState.currentCol,
      preferredColumn: clientGameState.preferredColumn,
      gameMap: clientGameState.gameMap,
      textGrid: clientGameState.textGrid
    };
  } catch (error) {
    logger.error("Error getting current game state:", error);
    return null;
  }
}

// Update UI with predicted position immediately - optimized
function updateUIWithPrediction(predictedPos, gameMap) {
  try {
    // Update client state
    clientGameState.currentRow = predictedPos.newRow;
    clientGameState.currentCol = predictedPos.newCol;
    clientGameState.preferredColumn = predictedPos.preferredColumn;
    
    // Efficient map update
    const tempGameMap = gameMap.map(row => [...row]);
    
    // Clear old player positions and set new one
    for (let row = 0; row < tempGameMap.length; row++) {
      for (let col = 0; col < tempGameMap[row].length; col++) {
        if (tempGameMap[row][col] === 1) tempGameMap[row][col] = 0;
      }
    }
    tempGameMap[predictedPos.newRow][predictedPos.newCol] = 1;
    
    // Immediate visual update
    window.displayModule?.updateGameDisplay(tempGameMap);
  } catch (error) {
    logger.error("Prediction UI update error:", error);
  }
}

// Check if predictions are currently active
export function isPredictionActive() {
  return activePredictions.size > 0 || serverSyncPending;
}

// Initialize/update client state from server response
function updateClientGameState(result) {
  try {
    if (result.player_pos) {
      clientGameState.currentRow = result.player_pos.row;
      clientGameState.currentCol = result.player_pos.col;
      // Only update preferredColumn if explicitly provided by server, otherwise maintain existing value
      if (result.preferred_column !== undefined) {
        clientGameState.preferredColumn = result.preferred_column;
      } else if (!clientGameState.isInitialized) {
        // Only set to current column on first initialization
        clientGameState.preferredColumn = result.player_pos.col;
      }
    }
    
    if (result.game_map) {
      clientGameState.gameMap = result.game_map.map(row => [...row]); // Deep copy
    }
    
    if (result.text_grid) {
      // Use actual text grid from server if available
      clientGameState.textGrid = result.text_grid.map(row => [...row]); // Deep copy
    } else if (result.game_map && !clientGameState.textGrid.length) {
      // Generate textGrid from gameMap only if we don't have one yet (fallback)
      clientGameState.textGrid = result.game_map.map(row => 
        row.map(cell => {
          switch(cell) {
            case 0: return ' '; // EMPTY
            case 1: return '@'; // PLAYER
            case 2: return '#'; // ENEMY
            case 3: return '*'; // PEARL
            default: return ' ';
          }
        })
      );
    }
    
    clientGameState.isInitialized = true;
    logger.debug("Client game state initialized/updated:", clientGameState);
  } catch (error) {
    logger.error("Error updating client game state:", error);
  }
}

// Handle successful server sync (when prediction was correct)
function handleServerSyncSuccess(result, direction) {
  try {
    // Update client state from server (in case anything changed)
    updateClientGameState(result);
    
    // Update non-position game state (score, pearls, etc.)
    if (window.displayModule) {
      if (result.score !== undefined) {
        window.displayModule.updateScore(result.score);
      }
      
      // Update game map if it changed (e.g., pearl collected)
      if (result.game_map) {
        window.displayModule.updateGameDisplay(result.game_map);
      }
    }
    
    // Handle pearl collection
    if (result.pearl_collected) {
      handlePearlCollection(direction);
      if (window.scoreAnimations && window.scoreAnimations.showScoreUpdate) {
        window.scoreAnimations.showScoreUpdate();
      }
    }
    
    // Handle game completion
    if (result.is_completed) {
      handleGameCompletion(result);
    }
  } catch (error) {
    logger.error("Error handling server sync success:", error);
  }
}