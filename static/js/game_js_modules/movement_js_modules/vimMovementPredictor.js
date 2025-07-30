/**
 * VimMovementPredictor - Client-side movement prediction that mirrors the Go backend
 * This is the main module that orchestrates movement prediction using submodules
 */

import { validateDirection } from './vimPredictor_submodules/validation.js';
import { calculateNewPosition, calculateNewPositionWithCount } from './vimPredictor_submodules/movementCalculation.js';
import { lastCharSearch } from './vimPredictor_submodules/specialMovement.js';

// Main prediction function that handles multipliers like the Go backend
export function predictMovement(direction, currentRow, currentCol, gameMap, textGrid, preferredColumn, count = 1, hasExplicitCount = false) {
  try {
    // Validate and convert direction
    const finalDirection = validateDirection(direction);
    
    let totalMovesExecuted = 0;
    let finalMovementResult = null;
    
    if (count === 1) {
      // Single move - process normally
      let movementResult;
      
      // Use count-aware function for G commands even with count=1
      if (finalDirection === "file_end" || finalDirection === "file_start") {
        movementResult = calculateNewPositionWithCount(finalDirection, currentRow, currentCol, gameMap, textGrid, preferredColumn, count, hasExplicitCount);
      } else {
        movementResult = calculateNewPosition(finalDirection, currentRow, currentCol, gameMap, textGrid, preferredColumn);
      }
      
      if (movementResult.isValid) {
        totalMovesExecuted = 1;
        finalMovementResult = movementResult;
      }
    } else {
      // Multiplier move - for G commands, use absolute positioning; for others, iterate
      if (finalDirection === "file_end" || finalDirection === "file_start") {
        // For G commands, use absolute positioning directly
        const movementResult = calculateNewPositionWithCount(finalDirection, currentRow, currentCol, gameMap, textGrid, preferredColumn, count, hasExplicitCount);
        
        if (movementResult.isValid) {
          totalMovesExecuted = 1; // Count as single move since it's absolute positioning
          finalMovementResult = movementResult;
        }
      } else {
        // For other movements, iterate count times
        let tempRow = currentRow;
        let tempCol = currentCol;
        let tempPreferredColumn = preferredColumn;
        
        for (let i = 0; i < count; i++) {
          const movementResult = calculateNewPosition(finalDirection, tempRow, tempCol, gameMap, textGrid, tempPreferredColumn);
          
          // If movement is blocked, stop here
          if (!movementResult.isValid) {
            break;
          }
          
          // Update temporary position for next calculation
          tempRow = movementResult.newRow;
          tempCol = movementResult.newCol;
          tempPreferredColumn = movementResult.preferredColumn;
          
          finalMovementResult = movementResult;
          totalMovesExecuted++;
        }
      }
    }
    
    return {
      success: totalMovesExecuted > 0,
      finalPosition: finalMovementResult,
      movesExecuted: totalMovesExecuted,
      movesRequested: count
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      movesExecuted: 0,
      movesRequested: count
    };
  }
}

// Export the prediction function and utilities
export { validateDirection, lastCharSearch };