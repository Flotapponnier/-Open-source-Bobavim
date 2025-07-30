export class SpecialCommandHandler {
  constructor(keyboardHandler) {
    this.keyboardHandler = keyboardHandler;
    this.game = keyboardHandler.game;
    this.waitingForChar = false;
    this.charSearchMotion = null;
    this.waitingForGCommand = false;
  }

  isWaitingForInput() {
    return this.waitingForChar || this.waitingForGCommand;
  }

  handleCharSearchCompletion(key, event) {
    if (key.length === 1) {
      const fullDirection = this.getCharSearchDirection(this.charSearchMotion, key);
      const { count, hasExplicitCount } = this.keyboardHandler.numberPrefixHandler.getCountAndReset();
      
      this.waitingForChar = false;
      this.charSearchMotion = null;
      
      this.keyboardHandler.processMovement(fullDirection, count, hasExplicitCount);
      event.preventDefault();
      return true;
    } else if (key === 'Escape') {
      this.clearStates();
      event.preventDefault();
      return true;
    }
    return false;
  }

  handleGCommandCompletion(key, event) {
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
      return false;
    }
    
    const { count, hasExplicitCount } = this.keyboardHandler.numberPrefixHandler.getCountAndReset();
    
    if (key === 'g') {
      logger.debug('🎯 G-COMMAND COMPLETE: gg', { count, hasExplicitCount });
      this.waitingForGCommand = false;
      this.keyboardHandler.processMovement('gg', count, hasExplicitCount);
      event.preventDefault();
      return true;
    } else if (key === 'e') {
      logger.debug('🎯 G-COMMAND COMPLETE: ge', { count, hasExplicitCount });
      this.waitingForGCommand = false;
      this.keyboardHandler.processMovement('ge', count, hasExplicitCount);
      event.preventDefault();
      return true;
    } else if (key === 'E') {
      logger.debug('🎯 G-COMMAND COMPLETE: gE', { count, hasExplicitCount });
      this.waitingForGCommand = false;
      this.keyboardHandler.processMovement('gE', count, hasExplicitCount);
      event.preventDefault();
      return true;
    } else if (key === '_') {
      logger.debug('🎯 G-COMMAND COMPLETE: g_', { count, hasExplicitCount });
      this.waitingForGCommand = false;
      this.keyboardHandler.processMovement('g_', count, hasExplicitCount);
      event.preventDefault();
      return true;
    } else {
      logger.debug('🎯 G-COMMAND INVALID:', key);
      this.waitingForGCommand = false;
      this.keyboardHandler.numberPrefixHandler.clearPrefix();
      event.preventDefault();
      return true;
    }
  }

  handleGCommandInitiation(key, event) {
    if (key === 'g') {
      this.waitingForGCommand = true;
      logger.debug('🎯 G-COMMAND: Waiting for G-command');
      event.preventDefault();
      return true;
    }
    return false;
  }

  handleCharSearchInitiation(key, event) {
    if (['f', 'F', 't', 'T'].includes(key)) {
      this.waitingForChar = true;
      this.charSearchMotion = key;
      logger.debug('Waiting for character search:', key);
      event.preventDefault();
      return true;
    }
    return false;
  }

  handleEscape(key, event) {
    if (key === 'Escape') {
      logger.debug('🔢 ESCAPE: Clearing all states', {
        waitingForChar: this.waitingForChar,
        waitingForGCommand: this.waitingForGCommand,
        numberPrefix: this.keyboardHandler.numberPrefixHandler.numberPrefix,
        accumulatingNumber: this.keyboardHandler.numberPrefixHandler.accumulatingNumber
      });
      
      this.clearStates();
      this.keyboardHandler.numberPrefixHandler.clearPrefix();
      this.keyboardHandler.spaceCommandHandler.cleanup();
      event.preventDefault();
      return true;
    }
    return false;
  }

  clearStates() {
    this.waitingForChar = false;
    this.charSearchMotion = null;
    this.waitingForGCommand = false;
  }

  getCharSearchDirection(motion, char) {
    switch (motion) {
      case 'f':
        return `find_char_forward_${char}`;
      case 'F':
        return `find_char_backward_${char}`;
      case 't':
        return `till_char_forward_${char}`;
      case 'T':
        return `till_char_backward_${char}`;
      default:
        return motion;
    }
  }
}