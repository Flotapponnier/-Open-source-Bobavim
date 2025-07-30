import { isFavorite, addToFavorites, removeFromFavorites } from './favoritesManager.js';
import { filterMaps } from './mapFilter.js';
import { isMapUnlocked, isMapCompleted, getMapLockReason } from './mapProgressionManager.js';

export function updateMapDisplay(modal, map, cachedMaps, currentFilter, onFilterChange) {
  const difficultyColors = {
    tutorial: "#8B5A3C",
    easy: "#87A330", 
    medium: "#D67C2C",
    hard: "#C44536",
  };

  const difficultyHoverColors = {
    tutorial: "#6B4A2C",
    easy: "#67831C",
    medium: "#B66C1C",
    hard: "#A43526",
  };

  const mapUnlocked = isMapUnlocked(map.id);
  const mapCompleted = isMapCompleted(map.id);

  const headerEl = modal.querySelector("#modal-header");
  const titleEl = modal.querySelector(".map-title");

  if (headerEl) {
    const baseColor = difficultyColors[map.difficulty] || difficultyColors.tutorial;
    headerEl.style.background = mapUnlocked 
      ? `linear-gradient(90deg, #2c1810 0%, ${baseColor} 50%, #2c1810 100%)`
      : "linear-gradient(90deg, #2c1810 0%, #464649 50%, #2c1810 100%)";
  }

  if (titleEl) {
    let statusText = "";
    if (mapCompleted) {
      statusText = " ★";
    } else if (!mapUnlocked) {
      statusText = " ◼";
    }
    titleEl.textContent = `Select map : ${map.name.toUpperCase()}${statusText}`;
  }

  const mapContainer = modal.querySelector(".map-display-container");
  if (mapContainer) {
    const baseColor = difficultyColors[map.difficulty] || difficultyColors.tutorial;
    const rgbaColor = baseColor
      .replace("#", "")
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16))
      .join(", ");
    
    if (mapUnlocked) {
      mapContainer.style.background = `rgba(${rgbaColor}, 0.1)`;
      mapContainer.style.filter = "none";
    } else {
      mapContainer.style.background = "rgba(108, 117, 125, 0.1)";
      mapContainer.style.filter = "grayscale(100%) brightness(0.7)";
    }
  }

  updateNavigationButtons(modal, map, difficultyColors, difficultyHoverColors, mapUnlocked);
  updatePlayButton(modal, map, mapUnlocked);
  updateFavoriteButton(modal, map, cachedMaps, currentFilter, onFilterChange, mapUnlocked);
  renderGameGrid(modal, map.text_pattern, mapUnlocked, mapCompleted, map.id);
}

function updateNavigationButtons(modal, map, difficultyColors, difficultyHoverColors, mapUnlocked) {
  const prevBtn = modal.querySelector(".prev-map-btn");
  const nextBtn = modal.querySelector(".next-map-btn");

  if (prevBtn && nextBtn) {
    const buttonColor = mapUnlocked ? (difficultyColors[map.difficulty] || "#464649") : "#464649";
    const hoverColor = mapUnlocked ? (difficultyHoverColors[map.difficulty] || "#353538") : "#353538";

    prevBtn.style.background = buttonColor;
    nextBtn.style.background = buttonColor;

    prevBtn.onmouseenter = () => {
      prevBtn.style.background = hoverColor;
      prevBtn.style.transform = "translate(-1px, -1px)";
      prevBtn.style.boxShadow = "3px 3px 0 #2c1810";
    };
    prevBtn.onmouseleave = () => {
      prevBtn.style.background = buttonColor;
      prevBtn.style.transform = "translate(0, 0)";
      prevBtn.style.boxShadow = "2px 2px 0 #2c1810";
    };
    nextBtn.onmouseenter = () => {
      nextBtn.style.background = hoverColor;
      nextBtn.style.transform = "translate(-1px, -1px)";
      nextBtn.style.boxShadow = "3px 3px 0 #2c1810";
    };
    nextBtn.onmouseleave = () => {
      nextBtn.style.background = buttonColor;
      nextBtn.style.transform = "translate(0, 0)";
      nextBtn.style.boxShadow = "2px 2px 0 #2c1810";
    };
  }
}

function updatePlayButton(modal, map, mapUnlocked) {
  const playBtn = modal.querySelector(".play-map-btn");
  if (playBtn) {
    if (mapUnlocked) {
      playBtn.disabled = false;
      playBtn.style.opacity = "1";
      playBtn.style.cursor = "pointer";
      playBtn.style.background = "linear-gradient(135deg, #E9C46A 0%, #F4A261 50%, #E76F51 100%)";
      playBtn.textContent = "► PLAY (Enter)";
    } else {
      playBtn.disabled = true;
      playBtn.style.opacity = "0.6";
      playBtn.style.cursor = "not-allowed";
      playBtn.style.background = "#464649";
      playBtn.textContent = "◼ LOCKED";
    }
  }
}

function updateFavoriteButton(modal, map, cachedMaps, currentFilter, onFilterChange, mapUnlocked) {
  const favoriteBtn = modal.querySelector(".favorite-star");
  if (favoriteBtn) {
    const isFav = isFavorite(map.id);
    favoriteBtn.textContent = isFav ? "★" : "☆";
    favoriteBtn.style.color = isFav ? "#ffc107" : "rgba(255,255,255,0.6)";
    
    // Disable favorites for locked maps
    if (!mapUnlocked) {
      favoriteBtn.style.opacity = "0.3";
      favoriteBtn.style.cursor = "not-allowed";
    } else {
      favoriteBtn.style.opacity = "1";
      favoriteBtn.style.cursor = "pointer";
    }

    const newFavoriteBtn = favoriteBtn.cloneNode(true);
    favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);

    if (mapUnlocked) {
      newFavoriteBtn.addEventListener("click", () => {
        if (isFavorite(map.id)) {
          removeFromFavorites(map.id);
        } else {
          addToFavorites(map.id);
        }
        
        updateMapDisplay(modal, map, cachedMaps, currentFilter, onFilterChange);

        if (currentFilter === "favorite" && !isFavorite(map.id)) {
          const filteredMaps = filterMaps(cachedMaps, currentFilter);
          if (filteredMaps.length === 0) {
            onFilterChange("all", filterMaps(cachedMaps, "all"));
            resetFilterButtons(modal);
          } else {
            onFilterChange(currentFilter, filteredMaps);
          }
        }
      });

      newFavoriteBtn.addEventListener("mouseenter", () => {
        newFavoriteBtn.style.transform = "scale(1.1)";
        newFavoriteBtn.style.background = "rgba(0,0,0,0.7)";
      });
      newFavoriteBtn.addEventListener("mouseleave", () => {
        newFavoriteBtn.style.transform = "scale(1)";
        newFavoriteBtn.style.background = "rgba(0,0,0,0.5)";
      });
    }
  }
}

function resetFilterButtons(modal) {
  const filterBtns = modal.querySelectorAll(".filter-btn");
  const filterColors = {
    tutorial: "#9C27B0",
    easy: "#4CAF50",
    medium: "#FF9800",
    hard: "#F44336",
    favorite: "#FFC107",
    all: "#6c757d",
  };

  filterBtns.forEach((b) => {
    b.classList.remove("active");
    b.style.background = filterColors[b.dataset.filter] || "#6c757d";
    b.style.color = "white";
  });

  const allBtn = modal.querySelector('[data-filter="all"]');
  allBtn.classList.add("active");
  allBtn.style.background = "white";
  allBtn.style.color = "#333";
}

function renderGameGrid(modal, textPattern, mapUnlocked, mapCompleted, mapId) {
  const lines = textPattern
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const grid = lines.map((line) => line.split(""));

  const gameBoard = modal.querySelector(".game-board-preview");
  gameBoard.innerHTML = "";

  // Add lock overlay for locked maps
  if (!mapUnlocked) {
    const lockOverlay = document.createElement("div");
    lockOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(44, 24, 16, 0.9), rgba(70, 70, 73, 0.8));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border: 2px solid #2c1810;
    `;
    
    const lockIcon = document.createElement("div");
    lockIcon.style.cssText = `
      font-size: 48px;
      color: #ffc107;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;
    lockIcon.textContent = "🔒";
    
    const lockText = document.createElement("div");
    lockText.style.cssText = `
      color: white;
      font-size: 16px;
      font-weight: bold;
      margin-top: 8px;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0,0,0,0.7);
      max-width: 300px;
      line-height: 1.3;
    `;
    lockText.textContent = getMapLockReason(mapId) || "Complete previous map to unlock";
    
    const lockContainer = document.createElement("div");
    lockContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    lockContainer.appendChild(lockIcon);
    lockContainer.appendChild(lockText);
    lockOverlay.appendChild(lockContainer);
    
    gameBoard.style.position = "relative";
    gameBoard.appendChild(lockOverlay);
    
    // Don't render the actual grid for locked maps to save performance
    return;
  }

  const gameMap = createGameMapFromGrid(grid);
  const containerRect = gameBoard.getBoundingClientRect();
  const availableWidth = containerRect.width || 450;
  const availableHeight = containerRect.height || 380;

  const maxCols = Math.max(...grid.map((row) => row.length));
  const maxRows = grid.length;

  const keyWidth = Math.floor((availableWidth - (maxCols + 1) * 1) / maxCols);
  const keyHeight = Math.floor((availableHeight - (maxRows + 1) * 1) / maxRows);
  let keySize = Math.min(keyWidth, keyHeight);

  keySize = Math.max(keySize, 8);
  keySize = Math.min(keySize, 28);

  const fontSize = Math.max(Math.floor(keySize * 0.4), 6);

  grid.forEach((row, rowIndex) => {
    const keyboardRow = document.createElement("div");
    keyboardRow.className = "keyboard-row-preview";
    keyboardRow.style.cssText = `
            display: flex;
            gap: 1px;
            justify-content: center;
        `;

    row.forEach((char, colIndex) => {
      const key = document.createElement("div");
      key.className = "key-preview";
      key.style.cssText = `
                position: relative;
                width: ${keySize}px;
                height: ${keySize}px;
                background: linear-gradient(135deg, #f4f1de 0%, #e9c46a 100%);
                border: 2px solid #2c1810;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Press Start 2P', 'Courier New', monospace;
                font-size: ${Math.max(Math.floor(fontSize * 0.8), 5)}px;
                color: #2c1810;
                box-shadow: 
                    1px 1px 0 #2c1810,
                    inset 1px 1px 0 rgba(244, 241, 222, 0.7);
                cursor: default;
                transition: all 0.1s ease;
                flex-shrink: 0;
                image-rendering: pixelated;
                text-shadow: 0.5px 0.5px 0 rgba(44, 24, 16, 0.3);
            `;

      key.textContent = char === " " ? " " : char;

      key.addEventListener("mouseenter", () => {
        key.style.transform = "translateY(-1px)";
        key.style.boxShadow =
          "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3)";
      });
      key.addEventListener("mouseleave", () => {
        key.style.transform = "";
        key.style.boxShadow =
          "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3)";
      });

      if (rowIndex === 0 && colIndex === 0) {
        key.style.background = "linear-gradient(145deg, #E9C46A, #F4A261)";
        key.style.borderColor = "#2c1810";
        key.style.color = "#2c1810";
        key.style.boxShadow = `0 0 ${Math.floor(keySize * 0.5)}px rgba(233, 196, 106, 0.6), inset 0 1px 1px rgba(255,255,255,0.3)`;
      }

      keyboardRow.appendChild(key);
    });

    gameBoard.appendChild(keyboardRow);
  });
}

function createGameMapFromGrid(grid) {
  const gameMap = grid.map((row) => row.map(() => 0));

  if (gameMap.length > 0 && gameMap[0].length > 0) {
    gameMap[0][0] = 1;
  }

  const pearlCount = Math.min(
    5,
    Math.max(3, Math.floor((grid.length * grid[0]?.length) / 20)),
  );
  let pearlsPlaced = 0;

  while (pearlsPlaced < pearlCount) {
    const row = Math.floor(Math.random() * grid.length);
    const col = Math.floor(Math.random() * (grid[row]?.length || 0));

    if (gameMap[row] && gameMap[row][col] === 0 && !(row === 0 && col === 0)) {
      gameMap[row][col] = 3;
      pearlsPlaced++;
    }
  }

  return gameMap;
}