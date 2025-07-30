export function navigateMap(modal, direction, filteredMaps, currentMapIndex, onNavigate) {
  const totalMaps = filteredMaps.length;
  if (totalMaps === 0) return currentMapIndex;
  
  const newIndex = (currentMapIndex + direction + totalMaps) % totalMaps;
  onNavigate(newIndex);
  return newIndex;
}

export function setupKeyboardNavigation(
  handleKeyDown,
  closeBtn,
  prevBtn,
  nextBtn,
  playBtn,
  onClose,
  onNavigate,
  onPlay
) {
  const keyDownHandler = (e) => {
    switch (e.key) {
      case "h":
        e.preventDefault();
        onNavigate(-1);
        break;
      case "l":
        e.preventDefault();
        onNavigate(1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onPlay();
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  closeBtn.addEventListener("click", onClose);
  prevBtn.addEventListener("click", () => onNavigate(-1));
  nextBtn.addEventListener("click", () => onNavigate(1));
  playBtn.addEventListener("click", onPlay);

  document.addEventListener("keydown", keyDownHandler);
  
  return keyDownHandler;
}