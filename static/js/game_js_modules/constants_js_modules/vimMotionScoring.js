// Vim Motion Scoring System
// This mirrors the backend scoring system for consistent UI feedback

const VIM_MOTION_SCORES = {
  // Basic directional movement (h, j, k, l)
  basicMovement: {
    "h": 100,
    "j": 100,
    "k": 100,
    "l": 100,
  },

  // Word movement (w, W, e, E, b, B, ge, gE)
  wordMovement: {
    "w": 120,
    "W": 120,
    "e": 120,
    "E": 120,
    "b": 120,
    "B": 120,
    "ge": 120,
    "gE": 120,
  },

  // Line movement (0, $, ^, g_)
  lineMovement: {
    "0": 120,
    "$": 120,
    "^": 130,
    "g_": 130,
  },

  // Find character movement (f, F, t, T)
  findChar: {
    "f": 125,
    "F": 125,
    "t": 125,
    "T": 125,
  },

  // Repeat find movement (; and ,)
  repeatFind: {
    ";": 130,
    ",": 130,
  },

  // File/line jumping (gg, G, line numbers)
  fileJump: {
    "gg": 130,
    "G": 130,
  },

  // Screen movement (H, M, L)
  screenMovement: {
    "H": 150,
    "M": 150,
    "L": 150,
  },

  // Paragraph/section movement ({, }, (, ))
  paragraphMovement: {
    "{": 160,
    "}": 160,
    "(": 160,
    ")": 160,
  },

  // Match movement (%)
  matchMovement: {
    "%": 200,
  },

  // Arrow key penalty
  arrowPenalty: {
    "ArrowUp": -50,
    "ArrowDown": -50,
    "ArrowLeft": -50,
    "ArrowRight": -50,
  },
};

// Get score for a given motion
export function getMotionScore(motion) {
  // Check each category for the motion
  if (VIM_MOTION_SCORES.basicMovement[motion]) {
    return VIM_MOTION_SCORES.basicMovement[motion];
  }
  if (VIM_MOTION_SCORES.wordMovement[motion]) {
    return VIM_MOTION_SCORES.wordMovement[motion];
  }
  if (VIM_MOTION_SCORES.lineMovement[motion]) {
    return VIM_MOTION_SCORES.lineMovement[motion];
  }
  if (VIM_MOTION_SCORES.findChar[motion]) {
    return VIM_MOTION_SCORES.findChar[motion];
  }
  if (VIM_MOTION_SCORES.repeatFind[motion]) {
    return VIM_MOTION_SCORES.repeatFind[motion];
  }
  if (VIM_MOTION_SCORES.fileJump[motion]) {
    return VIM_MOTION_SCORES.fileJump[motion];
  }
  if (VIM_MOTION_SCORES.screenMovement[motion]) {
    return VIM_MOTION_SCORES.screenMovement[motion];
  }
  if (VIM_MOTION_SCORES.paragraphMovement[motion]) {
    return VIM_MOTION_SCORES.paragraphMovement[motion];
  }
  if (VIM_MOTION_SCORES.matchMovement[motion]) {
    return VIM_MOTION_SCORES.matchMovement[motion];
  }
  if (VIM_MOTION_SCORES.arrowPenalty[motion]) {
    return VIM_MOTION_SCORES.arrowPenalty[motion];
  }

  // Handle numbered G commands (e.g., "5G")
  if (motion.length > 1 && motion[motion.length - 1] === 'G') {
    // Check if it's a numbered G command
    const numberPart = motion.slice(0, -1);
    if (/^\d+$/.test(numberPart)) {
      return VIM_MOTION_SCORES.fileJump["G"];
    }
  }

  // Handle find character motions (e.g., "find_char_forward_a")
  if (motion.startsWith("find_char_forward_")) {
    return VIM_MOTION_SCORES.findChar["f"];
  }
  if (motion.startsWith("find_char_backward_")) {
    return VIM_MOTION_SCORES.findChar["F"];
  }
  if (motion.startsWith("till_char_forward_")) {
    return VIM_MOTION_SCORES.findChar["t"];
  }
  if (motion.startsWith("till_char_backward_")) {
    return VIM_MOTION_SCORES.findChar["T"];
  }

  // Default to basic movement score for unknown motions
  return VIM_MOTION_SCORES.basicMovement["h"];
}

// Get motion category for a given motion
export function getMotionCategory(motion) {
  if (VIM_MOTION_SCORES.basicMovement[motion]) {
    return "Basic Movement";
  }
  if (VIM_MOTION_SCORES.wordMovement[motion]) {
    return "Word Movement";
  }
  if (VIM_MOTION_SCORES.lineMovement[motion]) {
    return "Line Movement";
  }
  if (VIM_MOTION_SCORES.findChar[motion]) {
    return "Find Character";
  }
  if (VIM_MOTION_SCORES.repeatFind[motion]) {
    return "Repeat Find";
  }
  if (VIM_MOTION_SCORES.fileJump[motion]) {
    return "File Jump";
  }
  if (VIM_MOTION_SCORES.screenMovement[motion]) {
    return "Screen Movement";
  }
  if (VIM_MOTION_SCORES.paragraphMovement[motion]) {
    return "Paragraph Movement";
  }
  if (VIM_MOTION_SCORES.matchMovement[motion]) {
    return "Match Movement";
  }
  if (VIM_MOTION_SCORES.arrowPenalty[motion]) {
    return "Arrow Penalty";
  }

  // Handle numbered G commands
  if (motion.length > 1 && motion[motion.length - 1] === 'G') {
    const numberPart = motion.slice(0, -1);
    if (/^\d+$/.test(numberPart)) {
      return "File Jump";
    }
  }

  // Handle find character motions
  if (motion.startsWith("find_char_forward_") || motion.startsWith("till_char_forward_") ||
      motion.startsWith("find_char_backward_") || motion.startsWith("till_char_backward_")) {
    return "Find Character";
  }

  return "Basic Movement";
}

// Get formatted score display text
export function getScoreDisplay(motion) {
  const score = getMotionScore(motion);
  const category = getMotionCategory(motion);
  
  return {
    score: score,
    category: category,
    text: score > 0 ? `+${score}` : `${score}`,
  };
}