// Tutorial Hints System
// Displays hint buttons and text for tutorial maps only
import { initializeTutorialHints, removeTutorialHints } from './tutorialHints_js_modules/hintEvents.js';
import { updateHintText, getHintText, triggerLowScoreMessage } from './tutorialHints_js_modules/hintManagement.js';
import { toggleHint } from './tutorialHints_js_modules/hintDisplay.js';
import { TUTORIAL_HINTS } from './tutorialHints_js_modules/hintContent.js';

export { 
  initializeTutorialHints, 
  removeTutorialHints, 
  updateHintText, 
  getHintText, 
  toggleHint,
  triggerLowScoreMessage,
  TUTORIAL_HINTS 
};