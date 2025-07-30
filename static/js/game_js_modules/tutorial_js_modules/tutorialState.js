let currentTutorialCommand = null;

export function getCurrentTutorialCommand() {
  return currentTutorialCommand;
}

export function setCurrentTutorialCommand(command) {
  currentTutorialCommand = command;
}

export function clearCurrentTutorialCommand() {
  currentTutorialCommand = null;
}