import { loadFavoritesFromDatabase } from './mapSelection_submodule/favoritesManager.js';
import { filterMaps, setupFilterHandlers } from './mapSelection_submodule/mapFilter.js';
import { createModalOverlay, createMapSelectionModal, closeModal } from './mapSelection_submodule/modalCreation.js';
import { updateMapDisplay } from './mapSelection_submodule/mapDisplay.js';
import { navigateMap, setupKeyboardNavigation } from './mapSelection_submodule/mapNavigation.js';
import { createDecorativeSprites, initializeAnimations } from './mapSelection_submodule/decorativeElements.js';
import { initializeProgression, isMapUnlocked } from './mapSelection_submodule/mapProgressionManager.js';

let cachedMaps = null;
let currentMapIndex = 0;
let filteredMaps = null;
let currentFilter = "all";

export async function showMapSelectionModal() {
  await loadFavoritesFromDatabase();
  await initializeProgression();

  const modalOverlay = createModalOverlay();

  if (!cachedMaps) {
    cachedMaps = await fetchMaps();
  }

  filteredMaps = filterMaps(cachedMaps, currentFilter);
  currentMapIndex = 0;

  const modalContent = createMapSelectionModal(cachedMaps);
  modalOverlay.appendChild(modalContent);

  const decorativeSprites = createDecorativeSprites();
  modalOverlay.appendChild(decorativeSprites);

  document.body.appendChild(modalOverlay);

  setupFilterHandlers(modalContent, cachedMaps, (filter, maps) => {
    currentFilter = filter;
    filteredMaps = maps;
    currentMapIndex = 0;
    if (filteredMaps.length > 0) {
      updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, (filter, maps) => {
        currentFilter = filter;
        filteredMaps = maps;
        currentMapIndex = 0;
        if (filteredMaps.length > 0) {
          updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, arguments.callee);
        }
      });
    }
  });

  updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, (filter, maps) => {
    currentFilter = filter;
    filteredMaps = maps;
    currentMapIndex = 0;
    if (filteredMaps.length > 0) {
      updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, arguments.callee);
    }
  });

  return new Promise((resolve, reject) => {
    const handleNavigation = (direction) => {
      currentMapIndex = navigateMap(modalContent, direction, filteredMaps, currentMapIndex, (newIndex) => {
        currentMapIndex = newIndex;
        updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, (filter, maps) => {
          currentFilter = filter;
          filteredMaps = maps;
          if (currentMapIndex >= filteredMaps.length) {
            currentMapIndex = filteredMaps.length - 1;
          }
          if (filteredMaps.length > 0) {
            updateMapDisplay(modalContent, filteredMaps[currentMapIndex], cachedMaps, currentFilter, arguments.callee);
          }
        });
      });
    };

    const handleClose = () => {
      closeModal(modalOverlay);
      document.removeEventListener("keydown", keyDownHandler);
      resolve(null);
    };

    const handlePlay = () => {
      const selectedMap = filteredMaps[currentMapIndex];
      
      // Check if map is unlocked before allowing play
      if (!isMapUnlocked(selectedMap.id)) {
        // Show error message or just return without doing anything
        logger.debug("Map is locked!");
        return;
      }
      
      closeModal(modalOverlay);
      document.removeEventListener("keydown", keyDownHandler);
      resolve(selectedMap);
    };

    const closeBtn = modalContent.querySelector(".close-modal");
    const prevBtn = modalContent.querySelector(".prev-map-btn");
    const nextBtn = modalContent.querySelector(".next-map-btn");
    const playBtn = modalContent.querySelector(".play-map-btn");

    const keyDownHandler = setupKeyboardNavigation(
      null,
      closeBtn,
      prevBtn,
      nextBtn,
      playBtn,
      handleClose,
      handleNavigation,
      handlePlay
    );
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
  }
}

export function clearMapCache() {
  cachedMaps = null;
  // Reset current filter and index
  currentFilter = "all";
  currentMapIndex = 0;
}

export function getCachedMaps() {
  return cachedMaps;
}

initializeAnimations();