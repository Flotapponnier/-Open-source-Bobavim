import {
  showCompletionModal,
  showFailureModal,
  formatTime,
} from "./gameCompletion.js";
import { COMPLETION_CONFIG } from "../constants_js_modules/gameCompletion.js";
import {
  showPearlBanner,
  showBlockedBanner,
  showNormalBanner,
} from "../ui_js_modules/gameBanner.js";
import { getScoreDisplay } from "../constants_js_modules/vimMotionScoring.js";
import { gameSoundEffectsManager } from "../gameSoundEffects.js";

export function handleSuccessfulMove(result, direction) {
  window.displayModule.updateGameDisplay(result.game_map);
  window.displayModule.updateScore(result.score);

  // Check if this was a partial movement (some moves blocked)
  if (
    result.moves_requested &&
    result.moves_executed &&
    result.moves_requested > result.moves_executed
  ) {
    // Skip partial movement feedback for G commands - they should always show success
    if (direction === "G") {
      // For G commands, just show the normal success message
      // Check if this was an explicit count (e.g., "1G") vs just "G"
      const hasExplicitCount = result.moves_requested > 1;
      window.feedbackModule.showMovementFeedback(
        direction,
        result.moves_requested,
        hasExplicitCount,
      );
    } else {
      // Some moves were blocked, show feedback about partial completion
      let blockedMessage;
      if (
        ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"].includes(direction)
      ) {
        blockedMessage = `${result.moves_executed} NOOB space + h (-${50 * result.moves_executed}) - executed ${result.moves_executed}/${result.moves_requested}, then BLOCKED!`;
      } else {
        blockedMessage = `You pressed ${direction} ${result.moves_requested} times - executed ${result.moves_executed}, then BLOCKED!`;
      }
      if (!window.gameState.tutorialMode) {
        showBlockedBanner(blockedMessage);
      }
    }
  }

  if (result.pearl_collected) {
    handlePearlCollection(direction);
  }
  if (result.is_completed) {
    handleGameCompletion(result);
  }
}

export function handlePearlCollection(direction) {
  const scoreDisplay = getScoreDisplay(direction);
  const message = `*** PEARL COLLECTED! *** ${scoreDisplay.text} points (${scoreDisplay.category})!`;
  
  logger.debug(message);

  // Play pearl collection sound
  gameSoundEffectsManager.playPearlCollectedSound();

  if (!window.gameState.tutorialMode) {
    showPearlCollectionFeedback(direction);
  }
}

export function showPearlCollectionFeedback(direction) {
  const scoreDisplay = getScoreDisplay(direction);
  const message = `*** PEARL COLLECTED! *** ${scoreDisplay.text} points (${scoreDisplay.category})!`;
  showPearlBanner(message);
  // No automatic message change - leave the pearl message visible
}

export function handleBlockedMove(result, direction) {
  logger.debug("Move blocked:", result.error);

  // Check if the game has failed (e.g., due to timeout)
  if (result.game_failed) {
    handleGameFailure(result);
    return;
  }

  // Play blocked movement sound
  gameSoundEffectsManager.playBlockedMovementSound();

  let message;

  // Special handling for arrow keys
  if (["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"].includes(direction)) {
    if (result.moves_requested && result.moves_requested > 1) {
      message = `${result.moves_requested} NOOB (-${50 * result.moves_requested}) - BLOCKED!`;
    } else {
      message = `NOOB (-50) - BLOCKED!`;
    }
  } else {
    // Check if this is a multiplied command that was completely blocked
    if (result.moves_requested && result.moves_requested > 1) {
      // Special handling for G command with count
      if (direction === "G") {
        message = `You pressed ${result.moves_requested}G to go to line ${result.moves_requested} - BLOCKED!`;
      } else {
        message = `You pressed ${direction} ${result.moves_requested} times - BLOCKED!`;
      }
    } else {
      message = window.BLOCKED_MESSAGES[direction];

      if (!message) {
        // Handle character search motions with custom blocked messages
        if (direction.startsWith("find_char_forward_")) {
          const char = direction.slice(18);
          message = `FIND CHAR '${char}' → - BLOCKED! (character not found)`;
        } else if (direction.startsWith("find_char_backward_")) {
          const char = direction.slice(19);
          message = `FIND CHAR '${char}' ← - BLOCKED! (character not found)`;
        } else if (direction.startsWith("till_char_forward_")) {
          const char = direction.slice(18);
          message = `TILL CHAR '${char}' → - BLOCKED! (character not found)`;
        } else if (direction.startsWith("till_char_backward_")) {
          const char = direction.slice(19);
          message = `TILL CHAR '${char}' ← - BLOCKED! (character not found)`;
        } else {
          message = `You pressed ${direction.toUpperCase()} - BLOCKED!`;
        }
      }
    }
  }


  if (!window.gameState.tutorialMode) {
    showBlockedMoveFeedback(message);
  }
}

export function showBlockedMoveFeedback(message) {
  showBlockedBanner(message);
}

export function handleGameCompletion(result) {
  logger.debug("Game completed! Final score:", result.final_score);

  // Play game completion sound
  gameSoundEffectsManager.playGameCompleteSound();

  // Disable further movement
  window.gameCompleted = true;
  
  // Stop real-time updates
  if (window.realTimeUpdatesModule) {
    window.realTimeUpdatesModule.stopGameStatePolling();
  }

  // Show completion message
  const headerInfo = document.querySelector(window.UI_SELECTORS.HEADER_INFO);
  if (headerInfo) {
    const timeText = result.completion_time
      ? `Time: ${formatTime(result.completion_time)}`
      : "Time: --:--";

    headerInfo.innerHTML = `<strong style="color: #ffd700; font-size: 1.2em; animation: pulse 1s ease-in-out infinite;">
      *** GAME COMPLETED! ***<br>
      Final Score: ${result.final_score} | ${timeText}
    </strong>`;
  }

  // Show 8-bit style win animation in the center of the game
  showWinAnimation();

  setTimeout(async () => {
    // Hide win animation before showing modal
    hideWinAnimation();
    await showCompletionModal(result);
  }, COMPLETION_CONFIG.TIMING.MODAL_DELAY_MS);
}

// Show 8-bit style win animation
function showWinAnimation() {
  // Create win animation overlay
  const winOverlay = document.createElement('div');
  winOverlay.id = 'win-animation-overlay';
  winOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    pointer-events: none;
  `;

  // Create win text element
  const winText = document.createElement('div');
  winText.id = 'win-text';
  winText.textContent = 'BOOOOOOOBBAAAA WIIIN !!!';
  winText.style.cssText = `
    font-family: 'Courier New', monospace;
    font-size: 3em;
    font-weight: bold;
    color: #00ff00;
    text-shadow: 
      0 0 10px #00ff00,
      0 0 20px #00ff00,
      0 0 30px #00ff00,
      2px 2px 0px #000000,
      -2px -2px 0px #000000,
      2px -2px 0px #000000,
      -2px 2px 0px #000000;
    animation: blink-win 0.5s infinite, glow-pulse 1s ease-in-out infinite alternate;
    text-align: center;
    letter-spacing: 0.1em;
    transform: scale(1);
  `;

  // Add CSS keyframes for animations
  if (!document.getElementById('win-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'win-animation-styles';
    style.textContent = `
      @keyframes blink-win {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
      @keyframes glow-pulse {
        0% { 
          transform: scale(1);
          text-shadow: 
            0 0 10px #00ff00,
            0 0 20px #00ff00,
            0 0 30px #00ff00,
            2px 2px 0px #000000,
            -2px -2px 0px #000000,
            2px -2px 0px #000000,
            -2px 2px 0px #000000;
        }
        100% { 
          transform: scale(1.1);
          text-shadow: 
            0 0 15px #00ff00,
            0 0 25px #00ff00,
            0 0 35px #00ff00,
            0 0 45px #00ff00,
            2px 2px 0px #000000,
            -2px -2px 0px #000000,
            2px -2px 0px #000000,
            -2px 2px 0px #000000;
        }
      }
    `;
    document.head.appendChild(style);
  }

  winOverlay.appendChild(winText);
  document.body.appendChild(winOverlay);
}

// Hide win animation
function hideWinAnimation() {
  const winOverlay = document.getElementById('win-animation-overlay');
  if (winOverlay) {
    winOverlay.remove();
  }
}

export function handleGameFailure(result) {
  logger.debug("Game failed:", result.error, "Reason:", result.reason);

  // Play appropriate failure sound
  if (result.reason === "timeout") {
    gameSoundEffectsManager.playTimeoutSound();
  } else if (result.reason === "pearl_mold_collision") {
    gameSoundEffectsManager.playMoldCollisionSound();
  }

  // Disable further movement
  window.gameCompleted = true;
  
  // Stop real-time updates
  if (window.realTimeUpdatesModule) {
    window.realTimeUpdatesModule.stopGameStatePolling();
  }

  // Show failure message
  const headerInfo = document.querySelector(window.UI_SELECTORS.HEADER_INFO);
  if (headerInfo) {
    let failureReason;
    if (result.reason === "timeout") {
      failureReason = "Time Limit Exceeded!";
    } else if (result.reason === "pearl_mold_collision") {
      failureReason = "Hit Pearl Mold!";
    } else {
      failureReason = "Game Failed!";
    }

    headerInfo.innerHTML = `<strong style="color: #e74c3c; font-size: 1.2em; animation: pulse 1s ease-in-out infinite;">
      *** ${failureReason} ***<br>
      Final Score: ${result.final_score || result.current_score || 0}
    </strong>`;
  }

  let failureMessage;
  if (result.reason === "timeout") {
    failureMessage = "*** Time's up! Game failed due to 8-minute time limit. ***";
  } else if (result.reason === "pearl_mold_collision") {
    failureMessage = "*** You touched the deadly pearl mold! Game over. ***";
  } else {
    failureMessage = `*** Game failed: ${result.error} ***`;
  }


  setTimeout(async () => {
    await showFailureModal(result);
  }, COMPLETION_CONFIG.TIMING.MODAL_DELAY_MS);
}

