// User preferences storage module
const STORAGE_KEY = 'boba-vim-preferences';

// Default preferences
const DEFAULT_PREFERENCES = {
  lineNumbers: false,        // Space + N
  relativeLineNumbers: false, // Space + R
  characterVisible: true,    // Space + Enter (default is visible)
  spaceHighlighting: false,  // Space + Space
  fullscreen: false          // Space + F
};

export function getUserPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new preferences
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    logger.error('Error loading user preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

export function saveUserPreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    logger.debug('User preferences saved:', preferences);
  } catch (error) {
    logger.error('Error saving user preferences:', error);
  }
}

export function updatePreference(key, value) {
  const preferences = getUserPreferences();
  preferences[key] = value;
  saveUserPreferences(preferences);
  return preferences;
}

export function togglePreference(key) {
  const preferences = getUserPreferences();
  preferences[key] = !preferences[key];
  saveUserPreferences(preferences);
  return preferences[key];
}

// Clear all preferences (reset to defaults)
export function clearPreferences() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.debug('User preferences cleared');
    return { ...DEFAULT_PREFERENCES };
  } catch (error) {
    logger.error('Error clearing user preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}