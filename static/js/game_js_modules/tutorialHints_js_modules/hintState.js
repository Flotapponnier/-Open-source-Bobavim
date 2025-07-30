// Tutorial hints state management
let hintContainer = null;
let currentMapId = null;
let isHintVisible = false;
let currentSpeechType = null; // 'tutorial', 'lowscore', or null

export function getHintContainer() {
  return hintContainer;
}

export function setHintContainer(container) {
  hintContainer = container;
}

export function getCurrentMapId() {
  return currentMapId;
}

export function setCurrentMapId(mapId) {
  currentMapId = mapId;
}

export function isHintCurrentlyVisible() {
  return isHintVisible;
}

export function setHintVisible(visible) {
  isHintVisible = visible;
}

export function getCurrentSpeechType() {
  return currentSpeechType;
}

export function setCurrentSpeechType(type) {
  currentSpeechType = type;
}

export function clearSpeechType() {
  currentSpeechType = null;
}