import { getFavoritesMaps } from './favoritesManager.js';

export function filterMaps(maps, filter) {
  if (filter === "all") return maps;
  if (filter === "favorite") {
    const favorites = getFavoritesMaps();
    return maps.filter((map) => favorites.includes(map.id));
  }
  return maps.filter((map) => map.difficulty === filter);
}

export function setupFilterHandlers(modal, cachedMaps, onFilterChange) {
  const filterBtns = modal.querySelectorAll(".filter-btn");
  const filterColors = {
    tutorial: "#9C27B0",
    easy: "#4CAF50",
    medium: "#FF9800",
    hard: "#F44336",
    favorite: "#FFC107",
    all: "#6c757d",
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => {
        b.classList.remove("active");
        b.style.background = filterColors[b.dataset.filter] || "#6c757d";
        b.style.color = "white";
      });

      btn.classList.add("active");
      btn.style.background = "white";
      btn.style.color = "#333";

      const currentFilter = btn.dataset.filter;
      const filteredMaps = filterMaps(cachedMaps, currentFilter);
      
      onFilterChange(currentFilter, filteredMaps);
    });
  });
}