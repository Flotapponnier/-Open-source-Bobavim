// Map-aware leaderboard module
import { getCachedMaps } from "./mapSelection.js";
import { LeaderboardModal } from "../leaderboard/leaderboard.js";

export function initializeMapLeaderboardButton() {
  const leaderboardButton = document.getElementById("leaderboardButton");

  if (!leaderboardButton) {
    logger.debug("leaderboardButton not found");
    return;
  }

  logger.debug("Initializing map-aware leaderboard button...");

  setupButtonHoverEffects(leaderboardButton);
  setupButtonClickHandler(leaderboardButton);
}

function setupButtonHoverEffects(button) {
  button.addEventListener("mouseenter", function () {
    button.textContent = "🏆";
  });

  button.addEventListener("mouseleave", function () {
    button.textContent = "🏆 Leaderboard";
  });
}

function setupButtonClickHandler(button) {
  button.addEventListener("click", async function () {
    logger.debug("Map leaderboard button clicked");

    setButtonLoadingState(button, true);

    try {
      await showMapLeaderboardModal();
    } catch (error) {
      logger.error("Error showing map leaderboard:", error);
      showErrorAlert("Failed to load leaderboard. Please try again.");
    } finally {
      setButtonLoadingState(button, false);
    }
  });
}

function setButtonLoadingState(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.textContent = "Loading...";
  } else {
    button.disabled = false;
    button.textContent = "🏆 Leaderboard";
  }
}

async function showMapLeaderboardModal() {
  let maps = getCachedMaps();
  if (!maps) {
    maps = await fetchMaps();
  }

  const leaderboardModal = new LeaderboardModal();
  await leaderboardModal.show({
    currentMapInfo: maps.find(m => m.id === 1), // Default to "Welcome to Boba"
    availableMaps: maps,
    showMapNavigation: true
  });
}

async function fetchMaps() {
  try {
    const response = await fetch("/api/maps");
    const data = await response.json();

    if (data.success && data.maps) {
      return data.maps;
    } else {
      throw new Error("Failed to fetch maps");
    }
  } catch (error) {
    logger.error("Error fetching maps:", error);
    return [];
  }
}

function showErrorAlert(message) {
  alert(message);
}