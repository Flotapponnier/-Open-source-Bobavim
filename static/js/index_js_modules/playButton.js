// Play button module - refactored into smaller functions
import { getSelectedCharacter } from "./characterSelection.js";
import { showMapSelectionModal } from "./mapSelection.js";

export function initializePlayButton() {
  const playButton = document.getElementById("playButton");

  if (!playButton) {
    logger.debug("playButton not found");
    return;
  }

  logger.debug("Initializing play button...");

  setupButtonHoverEffects(playButton);
  setupButtonClickHandler(playButton);
}

function setupButtonHoverEffects(button) {
  button.addEventListener("mouseenter", function () {
    button.textContent = "🧋";
  });

  button.addEventListener("mouseleave", function () {
    button.textContent = "🧋 Play";
  });
}

function setupButtonClickHandler(button) {
  button.addEventListener("click", async function () {
    logger.debug("Play button clicked");

    setButtonStartingState(button, true);

    try {
      await startGameWithMapSelection();
    } catch (error) {
      handleGameStartError(error, button);
    }
  });
}

function setButtonStartingState(button, isStarting) {
  if (isStarting) {
    button.disabled = true;
    button.textContent = "🚀 Starting...";
  } else {
    button.disabled = false;
    button.textContent = "🧋 Play";
  }
}

async function startGameWithMapSelection() {
  const playButton = document.getElementById("playButton");

  try {
    // Reset button state to allow map selection
    setButtonStartingState(playButton, false);

    // Show map selection modal
    const selectedMap = await showMapSelectionModal();
    logger.debug("Selected map:", selectedMap);

    // Check if user cancelled map selection
    if (!selectedMap) {
      logger.debug("Map selection cancelled by user");
      setButtonStartingState(playButton, false);
      return; // Exit without error
    }

    // Set starting state again
    setButtonStartingState(playButton, true);

    // Start game with selected map
    await startGameWithMap(selectedMap);
  } catch (error) {
    logger.debug("Map selection cancelled or failed:", error.message);
    // Reset button state if map selection was cancelled
    setButtonStartingState(playButton, false);
    throw error;
  }
}

async function startGameWithMap(selectedMap) {
  const selectedCharacter = getSelectedCharacter();
  
  // Console log for debugging character selection
  logger.debug("=== CHARACTER SELECTION DEBUG ===");
  logger.debug("Selected character:", selectedCharacter);
  logger.debug("Character type:", typeof selectedCharacter);
  logger.debug("Is premium character:", ["golden", "black"].includes(selectedCharacter));
  logger.debug("Selected map:", selectedMap.name, "(ID:", selectedMap.id, ")");

  try {
    // Create game session with selected map
    const response = await fetch("/api/start-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        map_id: selectedMap.id,
        selected_character: selectedCharacter,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Session is created and stored, now redirect to game page
      logger.debug(
        "Game session created successfully for map:",
        selectedMap.name,
      );
      window.location.href = "/play";
    } else {
      throw new Error(data.error || "Failed to start game");
    }
  } catch (error) {
    logger.error("Error starting game with map:", error);
    throw error;
  }
}

function handleGameStartError(error, button) {
  logger.error("Error starting game:", error);
  setButtonStartingState(button, false);
}
