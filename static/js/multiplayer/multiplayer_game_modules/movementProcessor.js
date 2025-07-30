import { MoveQueue } from "./movementProcessor_modules/moveQueue.js";
import { ClientPredictor } from "./movementProcessor_modules/clientPredictor.js";
import { ServerCommunicator } from "./movementProcessor_modules/serverCommunicator.js";
import { StateReconciler } from "./movementProcessor_modules/stateReconciler.js";

export class MovementProcessor {
  constructor(game) {
    this.game = game;
    
    // Initialize submodules
    this.moveQueue = new MoveQueue(this);
    this.clientPredictor = new ClientPredictor(this);
    this.serverCommunicator = new ServerCommunicator(this);
    this.stateReconciler = new StateReconciler(this);
  }

  // Delegate methods to submodules
  queueMove(direction, count = 1, hasExplicitCount = false) {
    this.moveQueue.queueMove(direction, count, hasExplicitCount);
  }

  // Expose the pendingMoves for external access (used by websocket manager)
  get pendingMoves() {
    return this.stateReconciler.pendingMoves;
  }
}