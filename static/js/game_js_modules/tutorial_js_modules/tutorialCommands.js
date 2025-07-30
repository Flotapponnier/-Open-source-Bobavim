import {
  getCurrentTutorialCommand,
  setCurrentTutorialCommand,
} from "./tutorialState.js";
import { showTutorialMessage } from "./tutorialUI.js";

export function generateRandomTutorialCommand() {
  if (!window.gameState.tutorialMode) return;

  const randomIndex = Math.floor(
    Math.random() * window.TUTORIAL_COMMANDS.length,
  );
  const command = window.TUTORIAL_COMMANDS[randomIndex];
  setCurrentTutorialCommand(command);

  showTutorialMessage(
    command.message,
    window.TUTORIAL_CONFIG.COLORS.INSTRUCTION,
  );
}

export function handleTutorialMovement(key) {
  const currentTutorialCommand = getCurrentTutorialCommand();
  if (!currentTutorialCommand) return;

  // Handle character search motions - now part of tutorial
  if (key.startsWith("find_char_") || key.startsWith("till_char_")) {
    // Extract the motion key from the full direction
    const motionKey = key.includes("find_char_forward") ? "f" :
                     key.includes("find_char_backward") ? "F" :
                     key.includes("till_char_forward") ? "t" :
                     key.includes("till_char_backward") ? "T" : null;
    
    if (motionKey && motionKey === currentTutorialCommand.key) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer(motionKey || key);
    }
    return;
  }

  // Handle g-command combinations
  if (["gg", "ge", "gE", "g_"].includes(key)) {
    if (key === currentTutorialCommand.key) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer(key);
    }
    return;
  }

  if (key === currentTutorialCommand.key) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer(key);
  }
}

function handleCorrectAnswer() {
  const currentTutorialCommand = getCurrentTutorialCommand();
  const correctMessage = `✓ CORRECT! ${currentTutorialCommand.message}`;
  showTutorialMessage(correctMessage, window.TUTORIAL_CONFIG.COLORS.CORRECT);

  setTimeout(() => {
    generateRandomTutorialCommand();
  }, window.TUTORIAL_CONFIG.TIMINGS.NEXT_COMMAND_DELAY);
}

function handleWrongAnswer(pressedKey) {
  const currentTutorialCommand = getCurrentTutorialCommand();
  const pressedCommand = window.TUTORIAL_COMMANDS.find(
    (cmd) => cmd.key === pressedKey,
  );
  if (!pressedCommand) return;

  const wrongMessage = `✗ Wrong! Expected: ${currentTutorialCommand.message}`;
  showTutorialMessage(wrongMessage, window.TUTORIAL_CONFIG.COLORS.WRONG);

  setTimeout(() => {
    showTutorialMessage(
      currentTutorialCommand.message,
      window.TUTORIAL_CONFIG.COLORS.INSTRUCTION,
    );
  }, window.TUTORIAL_CONFIG.TIMINGS.WRONG_ANSWER_DISPLAY);
}
