// ================================
// DIFFICULTY-BASED COMPLETION THRESHOLDS
// ================================

export const DIFFICULTY_COMPLETION = {
  PEARL_THRESHOLDS: {
    tutorial: 5,
    easy: 10,
    medium: 15,
    hard: 20
  },
  
  DIFFICULTY_NAMES: {
    tutorial: "Tutorial",
    easy: "Easy", 
    medium: "Medium",
    hard: "Hard"
  },

  // Map ID ranges for each difficulty (based on backend list_map.go)
  DIFFICULTY_RANGES: {
    tutorial: { min: 1, max: 6 },
    easy: { min: 7, max: 9 },
    medium: { min: 10, max: 14 },
    hard: { min: 15, max: 17 }
  }
};

/**
 * Get difficulty level based on map ID
 * @param {number} mapId - The map ID
 * @returns {string} - The difficulty level (tutorial, easy, medium, hard)
 */
export function getDifficultyByMapId(mapId) {
  const ranges = DIFFICULTY_COMPLETION.DIFFICULTY_RANGES;
  
  if (mapId >= ranges.tutorial.min && mapId <= ranges.tutorial.max) {
    return 'tutorial';
  } else if (mapId >= ranges.easy.min && mapId <= ranges.easy.max) {
    return 'easy';
  } else if (mapId >= ranges.medium.min && mapId <= ranges.medium.max) {
    return 'medium';
  } else if (mapId >= ranges.hard.min && mapId <= ranges.hard.max) {
    return 'hard';
  }
  
  // Default to easy for unknown maps
  return 'easy';
}

/**
 * Get pearl threshold for a specific map ID
 * @param {number} mapId - The map ID
 * @returns {number} - Number of pearls required to complete the map
 */
export function getPearlThresholdByMapId(mapId) {
  const difficulty = getDifficultyByMapId(mapId);
  return DIFFICULTY_COMPLETION.PEARL_THRESHOLDS[difficulty];
}

/**
 * Check if game is completed based on pearls collected and map difficulty
 * @param {number} pearlsCollected - Number of pearls collected
 * @param {number} mapId - The map ID
 * @returns {boolean} - Whether the game is completed
 */
export function isGameCompleted(pearlsCollected, mapId) {
  const threshold = getPearlThresholdByMapId(mapId);
  return pearlsCollected >= threshold;
}

/**
 * Get completion progress as percentage
 * @param {number} pearlsCollected - Number of pearls collected
 * @param {number} mapId - The map ID
 * @returns {number} - Completion percentage (0-100)
 */
export function getCompletionProgress(pearlsCollected, mapId) {
  const threshold = getPearlThresholdByMapId(mapId);
  return Math.min(100, Math.round((pearlsCollected / threshold) * 100));
}

/**
 * Get difficulty display info for UI
 * @param {number} mapId - The map ID
 * @returns {object} - Object with difficulty name, threshold, and color
 */
export function getDifficultyDisplayInfo(mapId) {
  const difficulty = getDifficultyByMapId(mapId);
  const threshold = getPearlThresholdByMapId(mapId);
  const name = DIFFICULTY_COMPLETION.DIFFICULTY_NAMES[difficulty];
  
  // Difficulty colors for UI
  const colors = {
    tutorial: '#4ecdc4',
    easy: '#95e39d', 
    medium: '#feca57',
    hard: '#ff6b6b'
  };
  
  return {
    difficulty,
    name,
    threshold,
    color: colors[difficulty]
  };
}