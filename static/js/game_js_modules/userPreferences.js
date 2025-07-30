// User preferences module for saving space command settings
import { 
  getUserPreferences, 
  saveUserPreferences, 
  updatePreference, 
  togglePreference, 
  clearPreferences 
} from './userPreferences_js_modules/preferencesStorage.js';
import { applySavedPreferences } from './userPreferences_js_modules/preferencesApplier.js';

export { 
  getUserPreferences, 
  saveUserPreferences, 
  updatePreference, 
  togglePreference, 
  clearPreferences, 
  applySavedPreferences 
};