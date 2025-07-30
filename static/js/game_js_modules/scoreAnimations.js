// Score Animation System
// Handles colorful animations for score changes
import { initializeScoreAnimations, updateScoreWithAnimation, startScoreMonitoring, resetLowScoreTrigger, isLowScoreTriggered } from './scoreAnimations_js_modules/scoreUpdater.js';
import { triggerPenaltyAnimation, triggerPearlAnimation } from './scoreAnimations_js_modules/animationEffects.js';

export { 
  initializeScoreAnimations, 
  updateScoreWithAnimation, 
  startScoreMonitoring,
  resetLowScoreTrigger,
  isLowScoreTriggered,
  triggerPenaltyAnimation, 
  triggerPearlAnimation 
};