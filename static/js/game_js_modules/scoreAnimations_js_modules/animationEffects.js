import { getScoreElement } from './scoreState.js';

// Trigger red penalty animation
export function triggerPenaltyAnimation() {
  const scoreElement = getScoreElement();
  if (!scoreElement) return;
  
  scoreElement.classList.add('score-penalty');
  
  // Remove the class after animation completes
  setTimeout(() => {
    scoreElement.classList.remove('score-penalty');
  }, 600);
}

// Trigger yellow/gold pearl collection animation
export function triggerPearlAnimation() {
  const scoreElement = getScoreElement();
  if (!scoreElement) return;
  
  scoreElement.classList.add('score-pearl');
  
  // Remove the class after animation completes
  setTimeout(() => {
    scoreElement.classList.remove('score-pearl');
  }, 800);
}