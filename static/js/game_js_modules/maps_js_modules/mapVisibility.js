export function isMapVisible() {
  const mapDisplay = document.getElementById(
    window.MAP_CONFIG.DISPLAY_ELEMENT_ID,
  );
  return (
    mapDisplay &&
    mapDisplay.style.display !== "none" &&
    mapDisplay.style.display !== ""
  );
}

export function toggleMapDisplay() {
  const mapDisplay = document.getElementById(
    window.MAP_CONFIG.DISPLAY_ELEMENT_ID,
  );
  if (!mapDisplay) return;

  const isCurrentlyVisible =
    mapDisplay.style.display !== "none" && mapDisplay.style.display !== "";

  mapDisplay.style.display = isCurrentlyVisible ? "none" : "block";
}