export class DisplayUtils {
  constructor(displayManager) {
    this.displayManager = displayManager;
    this.game = displayManager.game;
  }

  positionsEqual(pos1, pos2) {
    if (!pos1 || !pos2) {
      logger.debug('🔍 positionsEqual: one position is null/undefined', JSON.stringify(pos1), JSON.stringify(pos2));
      return false;
    }
    const equal = pos1.row === pos2.row && pos1.col === pos2.col;
    if (!equal) {
      logger.debug('🔍 positionsEqual: positions differ', JSON.stringify(pos1), 'vs', JSON.stringify(pos2));
    }
    return equal;
  }

  throttledDisplayUpdate() {
    const now = Date.now();
    
    if (now - this.displayManager.lastDisplayUpdate >= this.displayManager.displayUpdateThrottle) {
      this.displayManager.lastDisplayUpdate = now;
      this.displayManager.updateGameDisplayOptimized();
      this.displayManager.pendingDisplayUpdate = false;
    } else if (!this.displayManager.pendingDisplayUpdate) {
      this.displayManager.pendingDisplayUpdate = true;
      const nextUpdateIn = this.displayManager.displayUpdateThrottle - (now - this.displayManager.lastDisplayUpdate);
      
      setTimeout(() => {
        if (this.displayManager.pendingDisplayUpdate) {
          this.displayManager.lastDisplayUpdate = Date.now();
          this.displayManager.updateGameDisplayOptimized();
          this.displayManager.pendingDisplayUpdate = false;
        }
      }, nextUpdateIn);
    }
  }

  clearAllStaticHighlights() {
    const mapElement = document.getElementById('multiplayer-game-map');
    if (!mapElement) return;
    
    const allSprites = mapElement.querySelectorAll('.boba-character, .pearl');
    allSprites.forEach(sprite => sprite.remove());
    logger.debug(`💀 Removed ${allSprites.length} dead sprites from initial render`);
    
    const allKeys = mapElement.querySelectorAll('[data-map]');
    let clearedCount = 0;
    
    allKeys.forEach(keyElement => {
      const currentValue = keyElement.getAttribute('data-map');
      if (currentValue && currentValue !== '0') {
        keyElement.setAttribute('data-map', '0');
        clearedCount++;
      }
    });
    
    logger.debug(`🧹 Cleared ${clearedCount} static key highlights`);
  }
}