import { createHintSystem } from "./hintDisplay.js";
import {
  getHintContainer,
  setHintContainer,
  getCurrentMapId,
  setCurrentMapId,
  setHintVisible,
} from "./hintState.js";

// Initialize the hint system when the game loads
export function initializeTutorialHints() {
  // Check if we're in a tutorial map by fetching game state
  fetchCurrentMapInfo();
}

async function fetchCurrentMapInfo() {
  try {
    const response = await fetch(window.API_ENDPOINTS.GAME_STATE);
    if (response.ok) {
      const gameData = await response.json();
      if (gameData.success && gameData.current_map) {
        const mapInfo = gameData.current_map;
        setCurrentMapId(mapInfo.id);

        // Show hint system for tutorial difficulty maps, map 10 (Big boba cross), and map 14 (Inception)
        if (
          mapInfo.difficulty === "tutorial" ||
          mapInfo.id === 10 ||
          mapInfo.id === 14
        ) {
          createHintSystem(mapInfo.id);
        }
      }
    }
  } catch (error) {
    logger.error("Failed to fetch game state for tutorial hints:", error);
  }
}

// Function to remove hint system (called when leaving tutorial maps)
export function removeTutorialHints() {
  const hintContainer = getHintContainer();
  if (hintContainer && hintContainer.parentNode) {
    hintContainer.parentNode.removeChild(hintContainer);
    setHintContainer(null);
    setCurrentMapId(null);
    setHintVisible(false);
  }
}

