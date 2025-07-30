// Score animation state management
let scoreElement = null;
let lastScore = 0;

export function getScoreElement() {
  return scoreElement;
}

export function setScoreElement(element) {
  scoreElement = element;
}

export function getLastScore() {
  return lastScore;
}

export function setLastScore(score) {
  lastScore = score;
}