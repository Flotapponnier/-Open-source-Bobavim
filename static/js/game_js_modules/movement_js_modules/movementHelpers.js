export function getCharSearchDirection(motion, character) {
  const directionMap = {
    f: "find_char_forward",
    F: "find_char_backward",
    t: "till_char_forward",
    T: "till_char_backward",
  };

  return `${directionMap[motion]}_${character}`;
}

export function showCharWaitingFeedback(motion) {
  const motionDescriptions = {
    f: "FIND CHAR → (type character)",
    F: "FIND CHAR ← (type character)",
    t: "TILL CHAR → (type character)",
    T: "TILL CHAR ← (type character)",
  };

  // Use the banner system for consistent wood-colored display
  if (window.gameBanner && window.gameBanner.showNormalBanner) {
    window.gameBanner.showNormalBanner(motionDescriptions[motion], 0);
  }
}

export function clearCharWaitingFeedback() {
  // Use the banner system to reset to original state
  if (window.gameBanner && window.gameBanner.resetGameBanner) {
    window.gameBanner.resetGameBanner();
  }
}

export function showGCommandFeedback() {
  // Use the banner system for consistent wood-colored display
  if (window.gameBanner && window.gameBanner.showNormalBanner) {
    window.gameBanner.showNormalBanner("g-COMMAND (press g, _, e, or E)", 0);
  }
}

export function clearGCommandFeedback() {
  // Use the banner system to reset to original state
  if (window.gameBanner && window.gameBanner.resetGameBanner) {
    window.gameBanner.resetGameBanner();
  }
}
