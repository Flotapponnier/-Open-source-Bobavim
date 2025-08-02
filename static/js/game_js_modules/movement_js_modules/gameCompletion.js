// ==================== Exported Functions ====================

import { COMPLETION_CONFIG } from "../constants_js_modules/gameCompletion.js";
import { LeaderboardModal } from "../../leaderboard/leaderboard.js";
import { markMapCompleted, requiresAccountConfirmation, isUserAuthenticated, isUserEmailConfirmed, getMapLockReason, isMapUnlocked } from "../../index_js_modules/mapSelection_submodule/mapProgressionManager.js";
import { createAvatarHTML, getCharacterDisplayName, getCharacterTextColor, getAvatarSpritePath } from "../../shared/character_sprites.js";
import { initializeGameCompletionVim, disableGameCompletionVim } from "../gameCompletionVimNavigation.js";

export function formatTime(timeValue) {
  if (timeValue === null || timeValue === undefined) return "N/A";
  
  // Debug logging to see what values we're getting
  logger.debug("formatTime received:", timeValue, "type:", typeof timeValue);
  
  // Convert to number if it's a string
  const numValue = Number(timeValue);
  
  // The backend now always sends milliseconds (int64)
  // So we can directly use the value as milliseconds 
  const totalMilliseconds = numValue;
  
  // Convert to seconds with 2 decimal places
  const totalSecondsFloat = totalMilliseconds / 1000.0;
  
  logger.debug("Converted to seconds:", totalSecondsFloat);
  
  // If less than 60 seconds, show as "6.55"
  if (totalSecondsFloat < 60.0) {
    return totalSecondsFloat.toFixed(2);
  }
  
  // If 60 seconds or more, show as "2:06.55"
  const minutes = Math.floor(totalSecondsFloat / 60);
  const remainingSeconds = totalSecondsFloat - (minutes * 60);
  
  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
}

async function getBestTimeInfo(mapId, currentTime, currentScore) {
  if (!mapId || !currentTime) {
    return { bestTimeInfo: null, isNewRecord: false };
  }

  try {
    // Check if user is logged in and get their stats
    const authResponse = await fetch("/api/auth/me");
    const authData = await authResponse.json();

    let isNewRecord = false;
    let bestTimeInfo = null;

    if (authData.success && authData.authenticated) {
      // User is logged in, sync with database
      try {
        const response = await fetch("/api/user/best-time", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            map_id: mapId,
            completion_time: currentTime,
            final_score: currentScore,
          }),
        });

        const result = await response.json();
        if (result.success) {
          isNewRecord = result.is_new_record;
          if (result.fastest_time) {
            if (isNewRecord) {
              bestTimeInfo = `<p style="margin: 0.8rem 0;"><strong>Previous Best:</strong> ${formatTime(result.fastest_time)}</p>`;
            } else {
              bestTimeInfo = `<p style="margin: 0.8rem 0;"><strong>Your Best:</strong> ${formatTime(result.fastest_time)}</p>`;
            }
          }
        }
      } catch (error) {
        logger.error("Failed to sync best time with database:", error);
        // Fall back to localStorage
        return getLocalBestTimeInfo(mapId, currentTime);
      }
    } else {
      // User not logged in, use localStorage only
      return getLocalBestTimeInfo(mapId, currentTime);
    }

    return { bestTimeInfo, isNewRecord };
  } catch (error) {
    logger.error("Error checking best time:", error);
    return { bestTimeInfo: null, isNewRecord: false };
  }
}

// Fallback function for localStorage-only best times
function getLocalBestTimeInfo(mapId, currentTime) {
  try {
    const localBestTimes = localStorage.getItem("boba-vim-best-times");
    let bestTimes = localBestTimes ? JSON.parse(localBestTimes) : {};

    const previousBest = bestTimes[mapId];
    let isNewRecord = false;
    let bestTimeInfo = null;

    if (previousBest) {
      if (currentTime < previousBest) {
        // New record!
        bestTimes[mapId] = currentTime;
        localStorage.setItem("boba-vim-best-times", JSON.stringify(bestTimes));
        isNewRecord = true;
        bestTimeInfo = `<p style="margin: 0.8rem 0;"><strong>Previous Best:</strong> ${formatTime(previousBest)}</p>`;
      } else {
        bestTimeInfo = `<p style="margin: 0.8rem 0;"><strong>Your Best:</strong> ${formatTime(previousBest)}</p>`;
      }
    } else {
      // First time playing this map
      bestTimes[mapId] = currentTime;
      localStorage.setItem("boba-vim-best-times", JSON.stringify(bestTimes));
      isNewRecord = true;
    }

    return { bestTimeInfo, isNewRecord };
  } catch (error) {
    logger.error("Error with local best time:", error);
    return { bestTimeInfo: null, isNewRecord: false };
  }
}

export async function showFailureModal(result) {
  logger.debug("showFailureModal called with result:", result);
  logger.debug("Total moves from result:", result.total_moves);
  logger.debug("Total moves type:", typeof result.total_moves);

  // If total_moves is missing, try to fetch it from the current game state
  if (result.total_moves === undefined || result.total_moves === null) {
    try {
      const gameStateResponse = await fetch(window.API_ENDPOINTS.GAME_STATE);
      if (gameStateResponse.ok) {
        const gameStateData = await gameStateResponse.json();
        if (gameStateData.success && gameStateData.total_moves !== undefined) {
          result.total_moves = gameStateData.total_moves;
          logger.debug("Fetched total_moves from game state:", result.total_moves);
        }
      }
    } catch (error) {
      logger.error("Failed to fetch game state for move count:", error);
    }
  }
  
  // Get map information and available maps
  let currentMapInfo = result.current_map || null;
  let availableMaps = [];

  logger.debug("Current map info (from result):", currentMapInfo);

  // Fetch available maps for navigation
  try {
    const mapsResponse = await fetch(window.API_ENDPOINTS.MAPS);
    if (mapsResponse.ok) {
      const mapsData = await mapsResponse.json();
      if (mapsData.success) {
        availableMaps = mapsData.maps;
      }
    }
  } catch (error) {
    logger.error("Error fetching maps:", error);
  }

  logger.debug("Available maps:", availableMaps);

  // Sync failure stats with database (similar to completion modal)
  const { bestTimeInfo, isNewRecord } = await getBestTimeInfo(
    currentMapInfo?.id,
    result.completion_time,
    result.final_score || result.current_score || 0,
  );

  const selectedCharacter = getSelectedCharacterFromStorage() || result.selected_character || "boba";
  const failureReason = result.reason === "timeout" ? "Time Limit Exceeded (8 minutes)" : "Game Failed";

  const modalHTML = `
    <div id="completion-modal" style="${getModalStyle()}">
      <div style="${getContentStyle()}">
        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem;">
          ${createAvatarHTML(selectedCharacter)}
          <h2 style="color: #e74c3c; margin: 0;">Map Failed</h2>
        </div>
        <div style="margin: 1.5rem 0;">
          <p style="margin: 0.8rem 0; color: #e74c3c;"><strong>Reason:</strong> ${failureReason}</p>
          <p style="margin: 0.8rem 0;"><strong>Final Score:</strong> ${result.final_score || result.current_score || 0}</p>
          <p style="margin: 0.8rem 0;"><strong>Total Moves:</strong> ${result.total_moves !== undefined && result.total_moves !== null ? result.total_moves : "--"}</p>
          <p style="margin: 0.8rem 0;"><strong>Time Survived:</strong> ${result.completion_time ? formatTime(result.completion_time) : "--:--"}</p>
          ${bestTimeInfo ? bestTimeInfo : ""}
        </div>
        <div style="${getButtonContainerStyle()}">
          ${getNavigationButtonsOrderedForFailure(currentMapInfo, availableMaps)}
          ${createButton(COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU, COMPLETION_CONFIG.BUTTONS.BACK_MENU, COMPLETION_CONFIG.GRADIENTS.BACK_MENU)}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Initialize game completion vim navigation for failure modal
  setTimeout(() => {
    initializeGameCompletionVim();
  }, 100);

  const hoverButtons = [
    {
      id: COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP,
      text: COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP,
    },
    {
      id: COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU,
      text: COMPLETION_CONFIG.BUTTONS.BACK_MENU,
    },
  ];

  // Add navigation buttons to hover effects if they exist
  if (document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP)) {
    hoverButtons.push({
      id: COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
      text: COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
    });
  }
  if (document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP)) {
    hoverButtons.push({
      id: COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
      text: COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
    });
  }

  setupHoverEffects(hoverButtons);
  setupClickHandlers(currentMapInfo, availableMaps, result);
}

export async function showCompletionModal(result) {
  logger.debug("showCompletionModal called with result:", result);
  logger.debug("Total moves from result:", result.total_moves);
  logger.debug("Total moves type:", typeof result.total_moves);

  // If total_moves is missing, try to fetch it from the current game state
  if (result.total_moves === undefined || result.total_moves === null) {
    try {
      const gameStateResponse = await fetch(window.API_ENDPOINTS.GAME_STATE);
      if (gameStateResponse.ok) {
        const gameStateData = await gameStateResponse.json();
        if (gameStateData.success && gameStateData.total_moves !== undefined) {
          result.total_moves = gameStateData.total_moves;
          logger.debug("Fetched total_moves from game state:", result.total_moves);
        }
      }
    } catch (error) {
      logger.error("Failed to fetch game state for move count:", error);
    }
  }

  // Mark map as completed for progression tracking
  if (result.current_map && result.current_map.id) {
    try {
      await markMapCompleted(result.current_map.id);
      logger.debug("Marked map as completed:", result.current_map.id);
    } catch (error) {
      logger.error("Failed to mark map as completed:", error);
    }
  }

  // Get map information from the result object (no need to fetch separately)
  let currentMapInfo = result.current_map || null;
  let availableMaps = [];

  // Fetch available maps for navigation
  try {
    const mapsResponse = await fetch(window.API_ENDPOINTS.MAPS);
    if (mapsResponse.ok) {
      const mapsData = await mapsResponse.json();
      if (mapsData.success) {
        availableMaps = mapsData.maps;
      }
    }
  } catch (error) {
    logger.error("Error fetching maps:", error);
  }

  logger.debug("Current map info (from result):", currentMapInfo);
  logger.debug("Available maps:", availableMaps);

  // Get user info and check for records
  const selectedCharacter =
    getSelectedCharacterFromStorage() || result.selected_character || "boba";
  const { bestTimeInfo, isNewRecord } = await getBestTimeInfo(
    currentMapInfo?.id,
    result.completion_time,
    result.final_score,
  );

  const modalHTML = `
    <div id="${COMPLETION_CONFIG.ELEMENT_IDS.COMPLETION_MODAL}" style="${getModalStyle()}">
      <div style="${getContentStyle()}">
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 1rem;">
            <span style="color: rgba(255,255,255,0.8); font-size: 0.9rem; font-weight: 500;">Add this map to favorite:</span>
            <button class="favorite-star-completion" style="
              background: rgba(0,0,0,0.3);
              border: none;
              font-size: 24px;
              cursor: pointer;
              padding: 8px;
              border-radius: 50%;
              width: 45px;
              height: 45px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease;
              color: rgba(255,255,255,0.6);
            ">☆</button>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem;">
          ${createAvatarHTML(selectedCharacter)}
          <h2 style="color: ${COMPLETION_CONFIG.COLORS.TITLE}; margin: 0;">${COMPLETION_CONFIG.MESSAGES.COMPLETION_TITLE}</h2>
        </div>
        <div style="margin: 1.5rem 0;">
          <p style="margin: 0.8rem 0;"><strong>${COMPLETION_CONFIG.MESSAGES.FINAL_SCORE}</strong> ${result.final_score}</p>
          <p style="margin: 0.8rem 0;"><strong>${COMPLETION_CONFIG.MESSAGES.COMPLETION_TIME}</strong> ${result.completion_time ? formatTime(result.completion_time) : COMPLETION_CONFIG.MESSAGES.TIME_FALLBACK}</p>
          <p style="margin: 0.8rem 0;"><strong>Total Moves:</strong> ${result.total_moves !== undefined && result.total_moves !== null ? result.total_moves : "--"}</p>
          ${bestTimeInfo ? bestTimeInfo : ""}
          ${isNewRecord ? '<p style="color: #ffd700; font-weight: bold; margin: 0.8rem 0;">🏆 NEW RECORD! 🏆</p>' : ""}
        </div>
        <div style="${getButtonContainerStyle()}">
          ${createButton(COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD, COMPLETION_CONFIG.BUTTONS.LEADERBOARD, COMPLETION_CONFIG.GRADIENTS.LEADERBOARD)}
          ${getNavigationButtonsOrdered(currentMapInfo, availableMaps)}
          ${createButton(COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU, COMPLETION_CONFIG.BUTTONS.BACK_MENU, COMPLETION_CONFIG.GRADIENTS.BACK_MENU)}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Initialize game completion vim navigation for success modal
  setTimeout(() => {
    initializeGameCompletionVim();
  }, 100);

  const hoverButtons = [
    {
      id: COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD,
      text: COMPLETION_CONFIG.BUTTONS.LEADERBOARD,
    },
    {
      id: COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP,
      text: COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP,
    },
    {
      id: COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU,
      text: COMPLETION_CONFIG.BUTTONS.BACK_MENU,
    },
  ];

  // Add navigation buttons to hover effects if they exist
  if (document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP)) {
    hoverButtons.push({
      id: COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
      text: COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
    });
  }
  if (document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP)) {
    hoverButtons.push({
      id: COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
      text: COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
    });
  }

  setupHoverEffects(hoverButtons);
  setupClickHandlers(currentMapInfo, availableMaps, result);
}

// ==================== Internal Helpers ====================

function getModalStyle() {
  return `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${COMPLETION_CONFIG.COLORS.OVERLAY};
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: ${COMPLETION_CONFIG.MODAL.Z_INDEX};
  `;
}

function getContentStyle() {
  return `
    background: ${COMPLETION_CONFIG.COLORS.MODAL_BG};
    color: white;
    padding: 2rem;
    border-radius: 10px;
    text-align: center;
    max-width: 600px;
    width: 95%;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: ${COMPLETION_CONFIG.SHADOWS.MODAL};
    margin-top: 8vh;
  `;
}

function getButtonContainerStyle() {
  return `
    margin: 2rem 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
  `;
}

function getButtonStyle(gradient) {
  // Use retro button class instead of inline styles
  const buttonClass = getButtonClass(id);
  return `class="eightbit-completion-btn ${buttonClass}"`;
}

function getButtonClass(id) {
  if (id === 'viewLeaderboard') return 'leaderboard';
  if (id === 'backToMenu') return 'menu';
  if (id === 'nextMap' || id === 'previousMap') return 'navigation';
  return ''; // Default green style for playSameMap
}

function getDataActionAttribute(id) {
  const actionMap = {
    'viewLeaderboard': 'data-action="leaderboard"',
    'playSameMap': 'data-action="play-same-map"',
    'previousMap': 'data-action="previous-map"',
    'nextMap': 'data-action="next-map"',
    'backToMenu': 'data-action="back-to-menu"'
  };
  return actionMap[id] || '';
}

function createButton(id, label, gradient) {
  const buttonClass = getButtonClass(id);
  const dataAction = getDataActionAttribute(id);
  return `<button id="${id}" class="eightbit-completion-btn ${buttonClass}" ${dataAction}>${label}</button>`;
}

function getSmallButtonStyle(gradient) {
  // Use retro button class for small buttons too
  return `class="eightbit-completion-btn"`;
}

function createSmallButton(id, label, gradient) {
  const buttonClass = getButtonClass(id);
  const dataAction = getDataActionAttribute(id);
  return `<button id="${id}" class="eightbit-completion-btn ${buttonClass}" ${dataAction}>${label}</button>`;
}

function createDisabledButton(id, label, lockReason) {
  const dataAction = getDataActionAttribute(id);
  return `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
      <button id="${id}" disabled class="eightbit-completion-btn navigation" ${dataAction} style="
        background: #6c757d !important;
        color: #adb5bd !important;
        cursor: not-allowed !important;
        opacity: 0.6;
      ">${label}</button>
      <span style="
        font-size: 11px;
        color: #e74c3c;
        text-align: center;
        max-width: 200px;
        line-height: 1.2;
        font-weight: bold;
      ">${lockReason}</span>
    </div>
  `;
}

function setupHoverEffects(buttons) {
  buttons.forEach(({ id, text }) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    // Add shimmer effect for navigation buttons
    const isNavButton =
      id === COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP ||
      id === COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP ||
      id === COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP;

    btn.addEventListener("mouseenter", () => {
      if (isNavButton) {
        btn.style.transform = "translateY(-2px) scale(1.03)";
        btn.style.boxShadow =
          "0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15)";
        btn.style.filter = "brightness(1.1)";
      } else {
        btn.textContent = COMPLETION_CONFIG.BUTTONS.HOVER_ICON;
        btn.style.transform = "translateY(-3px) scale(1.05)";
      }
    });

    btn.addEventListener("mouseleave", () => {
      if (isNavButton) {
        btn.style.transform = "translateY(0) scale(1)";
        btn.style.boxShadow =
          "0 4px 15px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)";
        btn.style.filter = "brightness(1)";
      } else {
        btn.textContent = text;
        btn.style.transform = "translateY(0) scale(1)";
      }
    });
  });
}

function setupClickHandlers(currentMapInfo, availableMaps, result) {
  // Get current character from localStorage (same as index page) or fallback to result
  const currentCharacter =
    getSelectedCharacterFromStorage() || result.selected_character || "boba";
  logger.debug("Current character for navigation:", currentCharacter);
  logger.debug(
    "Character from localStorage:",
    getSelectedCharacterFromStorage(),
  );
  logger.debug("Character from result:", result.selected_character);

  // Setup favorite star functionality
  const favoriteStarBtn = document.querySelector(".favorite-star-completion");
  if (favoriteStarBtn && currentMapInfo) {
    // Update star appearance based on current favorite status
    updateFavoriteStarAppearance(favoriteStarBtn, currentMapInfo.id);

    favoriteStarBtn.addEventListener("click", async () => {
      await toggleMapFavorite(currentMapInfo.id);
      updateFavoriteStarAppearance(favoriteStarBtn, currentMapInfo.id);
    });
  }

  // Event handlers
  const leaderboardButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD);
  if (leaderboardButton) {
    leaderboardButton.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      showLeaderboard(currentMapInfo);
    }, { passive: false });
  }

  const playSameMapButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP);
  if (playSameMapButton) {
    playSameMapButton.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (currentMapInfo) {
        startGameWithMap(currentMapInfo.id, currentCharacter);
      } else {
        window.location.href = COMPLETION_CONFIG.NAVIGATION.PLAY_URL;
      }
    }, { passive: false });
  }

  const previousMapButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP);
  if (previousMapButton) {
    previousMapButton.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if button is disabled
      if (previousMapButton.disabled) {
        return;
      }
      
      const previousMap = getPreviousMap(currentMapInfo, availableMaps);
      if (previousMap && isMapUnlocked(previousMap.id)) {
        startGameWithMap(previousMap.id, currentCharacter);
      }
    }, { passive: false });
  }

  const nextMapButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP);
  if (nextMapButton) {
    nextMapButton.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if button is disabled
      if (nextMapButton.disabled) {
        return;
      }
      
      const nextMap = getNextMap(currentMapInfo, availableMaps);
      if (nextMap && isMapUnlocked(nextMap.id)) {
        startGameWithMap(nextMap.id, currentCharacter);
      }
    }, { passive: false });
  }

  const backToMenuButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU);
  if (backToMenuButton) {
    backToMenuButton.addEventListener("click", function(e) {
      window.location.href = COMPLETION_CONFIG.NAVIGATION.MENU_URL;
    });
  }
}

// ==================== Favorite Management Functions ====================

function getFavoritesMaps() {
  const favorites = localStorage.getItem("boba-vim-favorites");
  return favorites ? JSON.parse(favorites) : [];
}

async function addToFavorites(mapId) {
  const favorites = getFavoritesMaps();
  if (!favorites.includes(mapId)) {
    favorites.push(mapId);
    localStorage.setItem("boba-vim-favorites", JSON.stringify(favorites));

    // Sync with database if user is logged in
    await syncFavoriteToDatabase(mapId, "add");
  }
}

async function removeFromFavorites(mapId) {
  const favorites = getFavoritesMaps();
  const index = favorites.indexOf(mapId);
  if (index > -1) {
    favorites.splice(index, 1);
    localStorage.setItem("boba-vim-favorites", JSON.stringify(favorites));

    // Sync with database if user is logged in
    await syncFavoriteToDatabase(mapId, "remove");
  }
}

function isFavorite(mapId) {
  return getFavoritesMaps().includes(mapId);
}

async function toggleMapFavorite(mapId) {
  if (isFavorite(mapId)) {
    await removeFromFavorites(mapId);
  } else {
    await addToFavorites(mapId);
  }
}

// Database sync functions (duplicated from mapSelection.js for independence)
async function syncFavoriteToDatabase(mapId, action) {
  try {
    // Check if user is logged in
    const authResponse = await fetch("/api/auth/me");
    const authData = await authResponse.json();

    if (!authData.success || !authData.authenticated) {
      return; // User not logged in, skip database sync
    }

    if (action === "add") {
      await fetch("/api/user/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ map_id: mapId }),
      });
    } else if (action === "remove") {
      await fetch("/api/user/favorites", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ map_id: mapId }),
      });
    }
  } catch (error) {
    logger.error("Failed to sync favorite to database:", error);
  }
}

function updateFavoriteStarAppearance(starBtn, mapId) {
  const isCurrentlyFavorite = isFavorite(mapId);
  starBtn.textContent = isCurrentlyFavorite ? "★" : "☆";
  starBtn.style.color = isCurrentlyFavorite
    ? "rgba(255, 215, 0, 0.9)"
    : "rgba(255, 255, 255, 0.6)";
}

// ==================== Leaderboard Logic ====================

async function showLeaderboard(currentMapInfo) {
  logger.debug("showLeaderboard called for map:", currentMapInfo);

  // Disable game completion vim navigation
  disableGameCompletionVim();

  // Hide the completion modal temporarily
  const completionModal = document.getElementById('completionModal');
  if (completionModal) {
    completionModal.style.display = 'none';
  }

  const leaderboardModal = new LeaderboardModal();
  await leaderboardModal.show({
    currentMapInfo: currentMapInfo,
    availableMaps: [],
    showMapNavigation: false,
    showModeToggle: false, // Hide mode toggle button in game completion
    onClose: () => {
      // Show completion modal again when leaderboard is closed
      const completionModal = document.getElementById('completionModal');
      if (completionModal) {
        completionModal.style.display = 'flex';
        // Re-initialize game completion vim navigation
        setTimeout(() => {
          initializeGameCompletionVim();
        }, 100);
      }
    }
  });
}



// ==================== Character Selection Helpers ====================

function getSelectedCharacterFromStorage() {
  try {
    const saved = localStorage.getItem("boba_vim_selected_character");
    if (saved && ["boba", "pinky", "golden", "black", "boba_diamond"].includes(saved)) {
      logger.debug(`Loaded character from localStorage: ${saved}`);
      return saved;
    }
  } catch (error) {
    logger.warn("Failed to load character from localStorage:", error);
  }
  return null; // Return null so we can fallback to other methods
}

// ==================== Game Navigation Helpers ====================

function getNavigationButtons(currentMapInfo, availableMaps) {
  logger.debug("getNavigationButtons called with:");
  logger.debug("- currentMapInfo:", currentMapInfo);
  logger.debug("- availableMaps:", availableMaps);

  if (!currentMapInfo || !availableMaps.length) {
    logger.debug("No currentMapInfo or availableMaps, returning empty string");
    return "";
  }

  const currentIndex = availableMaps.findIndex(
    (map) => map.id === currentMapInfo.id,
  );
  logger.debug("Current map ID:", currentMapInfo.id);
  logger.debug("Found current map at index:", currentIndex);
  logger.debug("Total available maps:", availableMaps.length);

  let buttons = "";

  // Previous map button (only show if not first map)
  if (currentIndex > 0) {
    logger.debug("Adding Previous Map button (index > 0)");
    buttons += createSmallButton(
      COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
      COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
      COMPLETION_CONFIG.GRADIENTS.PREVIOUS_MAP,
    );
  } else {
    logger.debug("Not adding Previous Map button (index <= 0)");
  }

  // Next map button (only show if not last map)
  if (currentIndex < availableMaps.length - 1) {
    logger.debug("Adding Next Map button (index < length-1)");
    buttons += createSmallButton(
      COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
      COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
      COMPLETION_CONFIG.GRADIENTS.NEXT_MAP,
    );
  } else {
    logger.debug("Not adding Next Map button (index >= length-1)");
  }

  logger.debug("Generated navigation buttons HTML:", buttons);
  return buttons;
}

function getNavigationButtonsOrdered(currentMapInfo, availableMaps) {
  logger.debug("getNavigationButtonsOrdered called with:");
  logger.debug("- currentMapInfo:", currentMapInfo);
  logger.debug("- availableMaps:", availableMaps);

  if (!currentMapInfo || !availableMaps.length) {
    logger.debug(
      "No currentMapInfo or availableMaps, returning only play same map",
    );
    return `
      <div style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 100%;">
        ${createSmallButton(COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP, COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP, COMPLETION_CONFIG.GRADIENTS.PLAY_SAME_MAP)}
      </div>
    `;
  }

  const currentIndex = availableMaps.findIndex(
    (map) => map.id === currentMapInfo.id,
  );
  logger.debug("Current map ID:", currentMapInfo.id);
  logger.debug("Found current map at index:", currentIndex);
  logger.debug("Total available maps:", availableMaps.length);

  // Play Same Map button (always show) - top row
  let topRow = createSmallButton(
    COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP,
    COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP,
    COMPLETION_CONFIG.GRADIENTS.PLAY_SAME_MAP,
  );

  // Previous and Next map buttons - bottom row
  let bottomRow = "";

  // Previous map button (only show if not first map)
  if (currentIndex > 0) {
    const previousMap = availableMaps[currentIndex - 1];
    
    if (previousMap) {
      const lockReason = getMapLockReason(previousMap.id);
      const isLocked = lockReason !== null;
      
      if (isLocked) {
        // Show disabled previous button with lock reason
        bottomRow += createDisabledButton(
          COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
          COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
          lockReason
        );
      } else {
        logger.debug("Adding Previous Map button (index > 0)");
        bottomRow += createSmallButton(
          COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
          COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
          COMPLETION_CONFIG.GRADIENTS.PREVIOUS_MAP,
        );
      }
    }
  }

  // Next map button (always show if not last map, but disable if locked)
  if (currentIndex < availableMaps.length - 1) {
    const nextMap = availableMaps[currentIndex + 1];
    
    if (nextMap) {
      // Check if next map requires account confirmation or previous completion
      const lockReason = getMapLockReason(nextMap.id);
      const isLocked = lockReason !== null;
      
      if (isLocked) {
        // Show disabled next button with lock reason
        bottomRow += createDisabledButton(
          COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
          COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
          lockReason
        );
      } else {
        // Show normal next button
        logger.debug("Adding Next Map button (index < length-1)");
        bottomRow += createSmallButton(
          COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
          COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
          COMPLETION_CONFIG.GRADIENTS.NEXT_MAP,
        );
      }
    }
  }

  let html = `
    <div style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 100%;">
      <div style="display: flex; justify-content: center;">
        ${topRow}
      </div>
  `;

  if (bottomRow) {
    html += `
      <div style="display: flex; justify-content: center; gap: 20px; align-items: center;">
        ${bottomRow}
      </div>
    `;
  }

  html += `</div>`;

  logger.debug("Generated ordered navigation buttons HTML:", html);
  return html;
}

function getNavigationButtonsOrderedForFailure(currentMapInfo, availableMaps) {
  logger.debug("getNavigationButtonsOrderedForFailure called with:");
  logger.debug("- currentMapInfo:", currentMapInfo);
  logger.debug("- availableMaps:", availableMaps);

  if (!currentMapInfo || !availableMaps.length) {
    logger.debug(
      "No currentMapInfo or availableMaps, returning only play same map",
    );
    return `
      <div style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 100%;">
        ${createSmallButton(COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP, COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP, COMPLETION_CONFIG.GRADIENTS.PLAY_SAME_MAP)}
      </div>
    `;
  }

  const currentIndex = availableMaps.findIndex(
    (map) => map.id === currentMapInfo.id,
  );

  // For failure modals, just show play same map and basic navigation
  // Don't show account confirmation prompts since the user failed the current level
  let topRow = createSmallButton(
    COMPLETION_CONFIG.ELEMENT_IDS.PLAY_SAME_MAP,
    COMPLETION_CONFIG.BUTTONS.PLAY_SAME_MAP,
    COMPLETION_CONFIG.GRADIENTS.PLAY_SAME_MAP,
  );

  let bottomRow = "";

  // Previous map button (only show if not first map)
  if (currentIndex > 0) {
    bottomRow += createSmallButton(
      COMPLETION_CONFIG.ELEMENT_IDS.PREVIOUS_MAP,
      COMPLETION_CONFIG.BUTTONS.PREVIOUS_MAP,
      COMPLETION_CONFIG.GRADIENTS.PREVIOUS_MAP,
    );
  }

  // Next map button (only show if not last map and it's unlocked)
  if (currentIndex < availableMaps.length - 1) {
    const nextMap = availableMaps[currentIndex + 1];
    // Only show next button if the next map doesn't require account confirmation
    // or if the requirements are already met
    if (nextMap && !requiresAccountConfirmation(nextMap.id)) {
      bottomRow += createSmallButton(
        COMPLETION_CONFIG.ELEMENT_IDS.NEXT_MAP,
        COMPLETION_CONFIG.BUTTONS.NEXT_MAP,
        COMPLETION_CONFIG.GRADIENTS.NEXT_MAP,
      );
    }
  }

  let html = `
    <div style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 100%;">
      <div style="display: flex; justify-content: center;">
        ${topRow}
      </div>
  `;

  if (bottomRow) {
    html += `
      <div style="display: flex; justify-content: center; gap: 20px; align-items: center;">
        ${bottomRow}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function getPreviousMap(currentMapInfo, availableMaps) {
  if (!currentMapInfo || !availableMaps.length) return null;

  const currentIndex = availableMaps.findIndex(
    (map) => map.id === currentMapInfo.id,
  );
  
  if (currentIndex === -1) {
    logger.warn("Current map not found in available maps", currentMapInfo.id);
    return null;
  }
  
  const prevMap = currentIndex > 0 ? availableMaps[currentIndex - 1] : null;
  
  // Validate the previous map has a valid ID
  if (prevMap && (!prevMap.id || prevMap.id < 1 || prevMap.id > 19)) {
    logger.warn("Previous map has invalid ID:", prevMap.id);
    return null;
  }
  
  return prevMap;
}

function getNextMap(currentMapInfo, availableMaps) {
  if (!currentMapInfo || !availableMaps.length) return null;

  const currentIndex = availableMaps.findIndex(
    (map) => map.id === currentMapInfo.id,
  );
  
  if (currentIndex === -1) {
    logger.warn("Current map not found in available maps", currentMapInfo.id);
    return null;
  }
  
  const nextMap = currentIndex < availableMaps.length - 1
    ? availableMaps[currentIndex + 1]
    : null;
    
  // Validate the next map has a valid ID
  if (nextMap && (!nextMap.id || nextMap.id < 1 || nextMap.id > 19)) {
    logger.warn("Next map has invalid ID:", nextMap.id);
    return null;
  }
  
  return nextMap;
}

async function startGameWithMap(mapId, selectedCharacter = "boba") {
  logger.debug(
    "startGameWithMap called with mapId:",
    mapId,
    "character:",
    selectedCharacter,
  );

  // Validate inputs before making request
  if (!mapId || mapId < 1 || mapId > 19) {
    logger.error("Invalid map ID:", mapId);
    window.location.href = COMPLETION_CONFIG.NAVIGATION.PLAY_URL;
    return;
  }

  if (!selectedCharacter || selectedCharacter.trim() === "") {
    logger.error("Invalid character:", selectedCharacter);
    selectedCharacter = "boba"; // fallback to default
  }

  try {
    logger.debug("Sending request to:", window.API_ENDPOINTS.START_GAME);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(window.API_ENDPOINTS.START_GAME, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        map_id: mapId,
        selected_character: selectedCharacter,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    logger.debug("Response status:", response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    logger.debug("Start game result:", result);

    if (result.success) {
      logger.debug("Game started successfully, redirecting to /play");
      // Small delay to ensure session is saved before redirecting
      setTimeout(() => {
        window.location.href = "/play";
      }, 100);
    } else {
      logger.error("Failed to start game:", result.error);
      // Show user-friendly error message
      if (result.error === "Invalid map ID") {
        alert("This map is no longer available. Redirecting to map selection.");
      } else {
        alert("Failed to start game: " + result.error);
      }
      // Fallback to regular play URL
      window.location.href = COMPLETION_CONFIG.NAVIGATION.PLAY_URL;
    }
  } catch (error) {
    logger.error("Error starting game:", error);
    // Show user-friendly error message based on error type
    if (error.name === 'AbortError') {
      alert("Request timed out. Please check your connection and try again.");
    } else {
      alert("Unable to start game. Please try again.");
    }
    // Fallback to regular play URL
    window.location.href = COMPLETION_CONFIG.NAVIGATION.PLAY_URL;
  }
}

// ==================== Player Position HTML ====================

function createGameCompletionPlayerPositionHTML(playerPosition) {
  if (!playerPosition) return "";

  const formattedTime = playerPosition.completion_time
    ? formatTime(playerPosition.completion_time)
    : "--:--";

  const avatarHTML = createAvatarHTML(
    playerPosition.selected_character || "boba",
  );
  const characterText = getCharacterDisplayName(
    playerPosition.selected_character || "boba",
  );
  const textColor = getCharacterTextColor(
    playerPosition.selected_character || "boba",
  );
  const movesText = playerPosition.total_moves || "--";

  return `
    <div style="
      background: linear-gradient(45deg, #9b59b6, #8e44ad);
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      border: 2px solid #ffd700;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    ">
      <h3 style="color: white; margin: 0 0 0.5rem 0; text-align: center; font-size: 1.1rem;">
        🏅 Your Best Score on This Map
      </h3>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: bold; font-size: 1.2rem; color: #ffd700;">#${playerPosition.rank}</span>
          ${avatarHTML}
          <div>
            <span style="color: ${textColor}; font-weight: 600;">${playerPosition.username}</span>
            <span style="color: ${textColor}; font-size: 0.85em; opacity: 0.8; margin-left: 8px;">(${characterText})</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <div style="color: white; font-weight: bold; font-size: 1.1rem;">
            ${formattedTime}
          </div>
          <div style="color: #bdc3c7; font-size: 0.9rem;">
            ${movesText} moves
          </div>
        </div>
      </div>
    </div>
  `;
}

