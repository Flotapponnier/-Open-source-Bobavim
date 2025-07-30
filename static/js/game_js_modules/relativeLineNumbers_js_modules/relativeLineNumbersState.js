// Relative line numbers state management
let relativeLineNumbersVisible = false;
let relativeLineNumberElements = [];

export function isRelativeLineNumbersVisible() {
  return relativeLineNumbersVisible;
}

export function setRelativeLineNumbersVisible(visible) {
  relativeLineNumbersVisible = visible;
}

export function getRelativeLineNumberElements() {
  return relativeLineNumberElements;
}

export function setRelativeLineNumberElements(elements) {
  relativeLineNumberElements = elements;
}

export function addRelativeLineNumberElement(element) {
  relativeLineNumberElements.push(element);
}

export function clearRelativeLineNumberElements() {
  relativeLineNumberElements = [];
}