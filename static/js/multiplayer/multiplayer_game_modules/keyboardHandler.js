import { NumberPrefixHandler } from "./keyboardHandler_modules/numberPrefixHandler.js";
import { SpecialCommandHandler } from "./keyboardHandler_modules/specialCommandHandler.js";
import { MovementHandler } from "./keyboardHandler_modules/movementHandler.js";
import { SpaceCommandHandler } from "./keyboardHandler_modules/spaceCommandHandler.js";

export class KeyboardHandler {
  constructor(game) {
    this.game = game;
    
    // Initialize submodules
    this.numberPrefixHandler = new NumberPrefixHandler(this);
    this.specialCommandHandler = new SpecialCommandHandler(this);
    this.movementHandler = new MovementHandler(this);
    this.spaceCommandHandler = new SpaceCommandHandler(this);
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      if (!this.game.isConnected || !this.game.clientGameState) return;
      this.handleKeydown(event);
    });
  }

  handleKeydown(event) {
    const key = event.key;
    logger.debug('🎹 MULTIPLAYER KEYDOWN:', key, 'isConnected:', this.game.isConnected, 'hasClientGameState:', !!this.game.clientGameState);

    // Handle number input accumulation
    if (this.numberPrefixHandler.shouldHandleNumberInput(key)) {
      if (this.numberPrefixHandler.handleNumberInput(key)) {
        event.preventDefault();
        return;
      }
    }

    // Handle character search completion
    if (this.specialCommandHandler.waitingForChar) {
      if (this.specialCommandHandler.handleCharSearchCompletion(key, event)) {
        return;
      }
    }

    // Handle G-command completion
    if (this.specialCommandHandler.waitingForGCommand) {
      if (this.specialCommandHandler.handleGCommandCompletion(key, event)) {
        return;
      }
    }

    // Handle G-command initiation (MUST be before general movement check)
    if (this.specialCommandHandler.handleGCommandInitiation(key, event)) {
      return;
    }

    // Handle character search initiation
    if (this.specialCommandHandler.handleCharSearchInitiation(key, event)) {
      return;
    }

    // Handle space commands (space+n, space+f, space+space)
    if (this.spaceCommandHandler.shouldHandleSpaceCommand(key)) {
      if (this.spaceCommandHandler.handleSpaceCommand(event)) {
        return;
      }
    }

    // Handle movement commands
    if (this.movementHandler.handleMovementKey(key, event)) {
      return;
    }

    // Handle escape - clear any waiting states
    if (this.specialCommandHandler.handleEscape(key, event)) {
      return;
    }
  }

  processMovement(direction, count, hasExplicitCount = false) {
    logger.debug('🎮 PROCESS MOVEMENT:', {
      direction: direction,
      count: count,
      hasExplicitCount: hasExplicitCount,
      numberPrefixState: this.numberPrefixHandler.numberPrefix
    });
    this.game.movementProcessor.queueMove(direction, count, hasExplicitCount);
  }
}