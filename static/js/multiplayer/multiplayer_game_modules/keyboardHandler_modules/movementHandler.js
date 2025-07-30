import { VALID_MOVEMENT_KEYS } from "../../../game_js_modules/constants_js_modules/movement.js";

export class MovementHandler {
  constructor(keyboardHandler) {
    this.keyboardHandler = keyboardHandler;
    this.game = keyboardHandler.game;
  }

  handleMovementKey(key, event) {
    if (VALID_MOVEMENT_KEYS.includes(key)) {
      const { count, hasExplicitCount } = this.keyboardHandler.numberPrefixHandler.getCountAndReset();
      const finalDirection = count > 1 ? `${count}${key}` : key;
      
      logger.debug('🔢 MOVEMENT WITH COUNT:', {
        key: key,
        numberPrefix: this.keyboardHandler.numberPrefixHandler.numberPrefix,
        parsedCount: count,
        hasExplicitCount: hasExplicitCount,
        finalDirection: finalDirection
      });
      
      this.keyboardHandler.processMovement(key, count, hasExplicitCount);
      event.preventDefault();
      return true;
    }
    return false;
  }
}