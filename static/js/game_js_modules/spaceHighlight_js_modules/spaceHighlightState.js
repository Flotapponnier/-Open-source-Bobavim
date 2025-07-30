// Space highlight state management
let spaceHighlightActive = false;

export function isSpaceHighlightActive() {
  return spaceHighlightActive;
}

export function setSpaceHighlightActive(active) {
  spaceHighlightActive = active;
}