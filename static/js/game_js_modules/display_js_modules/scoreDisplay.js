import { getPearlThresholdByMapId, getCompletionProgress, getDifficultyDisplayInfo } from '../constants_js_modules/difficultyCompletion.js';

export function updateScore(score) {
  const scoreElement = document.getElementById(
    window.UI_SELECTORS.SCORE_ELEMENT.replace("#", ""),
  );
  if (scoreElement) {
    scoreElement.textContent = score;
    scoreElement.style.color = "#4ecdc4";
    scoreElement.style.transform = "scale(1.2)";
    setTimeout(() => {
      scoreElement.style.color = "#333";
      scoreElement.style.transform = "scale(1)";
    }, window.FEEDBACK_CONFIG.ANIMATION_DURATION);
  }
}

/**
 * Update pearl progress display with difficulty-based completion
 * @param {number} pearlsCollected - Number of pearls collected
 * @param {number} mapId - Current map ID
 */
export function updatePearlProgress(pearlsCollected, mapId) {
  // Update main score display with pearl count
  updateScore(pearlsCollected);
  
  // Update pearl progress display if it exists
  const pearlProgressElement = document.getElementById('pearl-progress');
  if (pearlProgressElement) {
    const threshold = getPearlThresholdByMapId(mapId);
    const progress = getCompletionProgress(pearlsCollected, mapId);
    const difficultyInfo = getDifficultyDisplayInfo(mapId);
    
    pearlProgressElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${difficultyInfo.color}; font-weight: bold;">
          🧋 ${pearlsCollected}/${threshold}
        </span>
        <div style="
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          width: 80px;
          height: 6px;
          overflow: hidden;
        ">
          <div style="
            background: ${difficultyInfo.color};
            width: ${progress}%;
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
          "></div>
        </div>
        <span style="color: #666; font-size: 0.9em;">
          ${difficultyInfo.name}
        </span>
      </div>
    `;
    
    // Pulse effect when pearl is collected
    pearlProgressElement.style.transform = "scale(1.1)";
    setTimeout(() => {
      pearlProgressElement.style.transform = "scale(1)";
    }, 200);
  }
}

/**
 * Create pearl progress display element
 * @param {number} mapId - Current map ID
 * @returns {string} - HTML for pearl progress display
 */
export function createPearlProgressDisplay(mapId) {
  const difficultyInfo = getDifficultyDisplayInfo(mapId);
  
  return `
    <div id="pearl-progress" style="
      position: absolute;
      top: 60px;
      left: 20px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 8px;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 50;
      transition: transform 0.2s ease;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${difficultyInfo.color}; font-weight: bold;">
          🧋 0/${difficultyInfo.threshold}
        </span>
        <div style="
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          width: 80px;
          height: 6px;
          overflow: hidden;
        ">
          <div style="
            background: ${difficultyInfo.color};
            width: 0%;
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
          "></div>
        </div>
        <span style="color: #ccc; font-size: 0.9em;">
          ${difficultyInfo.name}
        </span>
      </div>
    </div>
  `;
}