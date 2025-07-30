export class NumberPrefixHandler {
  constructor(keyboardHandler) {
    this.keyboardHandler = keyboardHandler;
    this.game = keyboardHandler.game;
    this.numberPrefix = '';
    this.accumulatingNumber = false;
  }

  handleNumberInput(key) {
    if (key === '0' && this.numberPrefix === '') {
      logger.debug('🔢 Processing 0 as movement command');
      this.keyboardHandler.processMovement(key, 1, false);
      return true;
    }
    
    if (this.numberPrefix.length >= 4) {
      return true; // Block further input
    }
    
    this.numberPrefix += key;
    this.accumulatingNumber = true;
    
    logger.debug('🔢 NUMBER PREFIX ACCUMULATED:', this.numberPrefix);
    return true;
  }

  getCountAndReset() {
    const count = this.numberPrefix === '' ? 1 : parseInt(this.numberPrefix);
    const hasExplicitCount = this.numberPrefix !== '';
    
    this.numberPrefix = '';
    this.accumulatingNumber = false;
    
    return { count, hasExplicitCount };
  }

  clearPrefix() {
    this.numberPrefix = '';
    this.accumulatingNumber = false;
  }

  shouldHandleNumberInput(key) {
    return !this.keyboardHandler.specialCommandHandler.isWaitingForInput() && /^[0-9]$/.test(key);
  }
}