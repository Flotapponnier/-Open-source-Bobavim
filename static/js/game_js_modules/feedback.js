import {
  storeOriginalHeaderContent,
  createFallbackMessage,
  updateHeaderWithMessage,
  addPulseAnimation,
} from "./feedback_js_modules/feedbackHelpers.js";
import {
  showNormalBanner,
  resetGameBanner,
} from "./ui_js_modules/gameBanner.js";

export function showMovementFeedback(key, count = 1, hasExplicitCount = false) {
  let message;

  // Extract base key from prefixed keys (e.g., "3ArrowLeft" -> "ArrowLeft")
  // But don't strip single "0" as it's a valid movement key
  const baseKey = key === "0" ? "0" : key.replace(/^\d+/, "");

  // Special handling for arrow keys
  if (["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"].includes(baseKey)) {
    if (count > 1) {
      message = `${count} NOOB space + h (-${50 * count})`;
    } else {
      message = "NOOB space + h (-50)";
    }
  } else {
    // Special handling for G command
    if (baseKey === "G") {
      if (hasExplicitCount) {
        message = `You pressed ${count}G to go to line ${count}`;
      } else {
        message =
          window.MOVEMENT_MESSAGES && window.MOVEMENT_MESSAGES[baseKey]
            ? window.MOVEMENT_MESSAGES[baseKey]
            : createFallbackMessage(baseKey);
      }
    } else if (count > 1) {
      // Create message with count information for other commands
      const baseMessage =
        window.MOVEMENT_MESSAGES && window.MOVEMENT_MESSAGES[baseKey]
          ? window.MOVEMENT_MESSAGES[baseKey]
          : createFallbackMessage(baseKey);
      message = `${baseMessage} (${count} times)`;
    } else {
      message =
        window.MOVEMENT_MESSAGES && window.MOVEMENT_MESSAGES[baseKey]
          ? window.MOVEMENT_MESSAGES[baseKey]
          : createFallbackMessage(baseKey);
    }
  }

  // Use the banner system without auto-reset
  showNormalBanner(message, 0);
}

export function showNumberPrefix(numberPrefix) {
  const message = `Type number: ${numberPrefix}`;
  showNormalBanner(message, 0); // No timeout - stays until cleared
}

export function clearNumberPrefix() {
  resetGameBanner();
}

export function resetHeaderInfo() {
  resetGameBanner();
}

