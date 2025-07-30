import { initializeMovement } from './movement_js_modules/movementEventHandlers.js';
import { initializeClientGameState } from './movement_js_modules/playerMovement.js';

// Initialize movement with client state
function initializeMovementWithPrediction() {
  // First initialize client-side game state from DOM
  initializeClientGameState();
  
  // Then initialize movement event handlers
  initializeMovement();
}

export { initializeMovement, initializeMovementWithPrediction };