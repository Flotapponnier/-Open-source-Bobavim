// Line numbers state management
let lineNumbersVisible = false;
let lineNumberElements = [];

export function isLineNumbersVisible() {
  return lineNumbersVisible;
}

export function setLineNumbersVisible(visible) {
  lineNumbersVisible = visible;
}

export function getLineNumberElements() {
  return lineNumberElements;
}

export function setLineNumberElements(elements) {
  lineNumberElements = elements;
}

export function addLineNumberElement(element) {
  lineNumberElements.push(element);
}

export function clearLineNumberElements() {
  lineNumberElements = [];
}