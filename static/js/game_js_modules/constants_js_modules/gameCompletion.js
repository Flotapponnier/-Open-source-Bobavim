// ================================
// GAME COMPLETION CONFIGURATION
// ================================

export const COMPLETION_CONFIG = {
  MODAL: {
    Z_INDEX: 1000,
    LEADERBOARD_Z_INDEX: 1001,
  },
  COLORS: {
    TITLE: "#ffd700",
    MODAL_BG: "#2c3e50", 
    OVERLAY: "rgba(0, 0, 0, 0.8)",
    BORDER: "#34495e",
    BUTTON_GRAY: "#95a5a6",
  },
  GRADIENTS: {
    LEADERBOARD: "linear-gradient(45deg, #f39c12, #e67e22)",
    PLAY_SAME_MAP: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    PREVIOUS_MAP: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    NEXT_MAP: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    BACK_MENU: "linear-gradient(45deg, #9b59b6, #8e44ad)",
  },
  SHADOWS: {
    BUTTON: "0 8px 20px rgba(0, 0, 0, 0.2)",
    MODAL: "0 0 20px rgba(255, 215, 0, 0.5)",
  },
  MESSAGES: {
    COMPLETION_TITLE: "Game Completed!",
    FINAL_SCORE: "Final Score:",
    COMPLETION_TIME: "Completion Time:",
    TIME_FALLBACK: "--:--",
    LEADERBOARD_TITLE: "🏆 Leaderboard 🏆",
    RANK_HEADER: "Rank",
    PLAYER_HEADER: "Player",
    TIME_HEADER: "Time",
    CLOSE: "Close",
  },
  BUTTONS: {
    LEADERBOARD: "🏆 Leaderboard",
    PLAY_SAME_MAP: "🧋 Play Same Map",
    PREVIOUS_MAP: "⬅️ Previous Map",
    NEXT_MAP: "➡️ Next Map",
    BACK_MENU: "🧋 Back to Menu", 
    HOVER_ICON: "🧋",
  },
  ELEMENT_IDS: {
    COMPLETION_MODAL: "completionModal",
    LEADERBOARD_MODAL: "leaderboardModal",
    VIEW_LEADERBOARD: "viewLeaderboard",
    PLAY_SAME_MAP: "playSameMap",
    PREVIOUS_MAP: "previousMap",
    NEXT_MAP: "nextMap",
    BACK_TO_MENU: "backToMenu",
    CLOSE_LEADERBOARD: "closeLeaderboard",
  },
  NAVIGATION: {
    PLAY_URL: "/play",
    MENU_URL: "/",
  },
  TIMING: {
    MODAL_DELAY_MS: 2000,
  },
};