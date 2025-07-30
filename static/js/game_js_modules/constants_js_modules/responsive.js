// ================================
// RESPONSIVE SCALING CONFIGURATION
// Enhanced for full map visibility
// ================================

export const RESPONSIVE_CONFIG = {
  SCALING: {
    SAFETY_MARGIN: 30,        // Increased margin to prevent edge clipping
    MAX_SCALE: 1.0,           // Don't scale up beyond 100% in normal mode
    FULLSCREEN_MAX_SCALE: 2.0, // Allow up to 200% in fullscreen mode for large maps
    MIN_SCALE: 0.1,           // Lower minimum scale to ensure large maps always fit
    SAFETY_FACTOR: 0.90,      // Reduced safety factor for better space utilization
  },
  TIMING: {
    RESIZE_DEBOUNCE_MS: 100,  // Faster response for better UX
    INITIAL_DELAY_MS: 50,     // Faster initial load
    FULLSCREEN_DELAY_MS: 150, // Slightly longer delay for fullscreen layout settling
  },
  SELECTORS: {
    GAME_BOARD: ".game-board",
    KEYBOARD_MAP: ".keyboard-map",
    GAME_CONTAINER: ".game-container",
  },
  CSS_PROPERTIES: {
    TRANSITION: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // Smoother easing
    NO_TRANSITION: "none",
    FAST_TRANSITION: "transform 0.2s ease-out",
  },
  
  // ================================
  // 🎛️ EASY SCALING ADJUSTMENTS
  // Modify these values to make things bigger/smaller!
  // ================================
  ADAPTIVE_SCALING: {
    // 📏 MARGINS - Minimal margins to maximize space usage
    MARGINS: {
      NORMAL_TOP_BOTTOM: 20,    // 🔧 ADJUST: Space from top/bottom in normal mode (minimal for max space)
      NORMAL_SIDES: 10,         // 🔧 ADJUST: Space from sides in normal mode (minimal for max space) 
      FULLSCREEN_TOP_BOTTOM: 30, // 🔧 ADJUST: Space from top/bottom in fullscreen (minimal for max space)
      FULLSCREEN_SIDES: 15,     // 🔧 ADJUST: Space from sides in fullscreen (minimal for max space)
    },
    
    // 🔑 KEY SIZES - Make these bigger for larger keys!
    KEY_SIZES: {
      // Normal mode key sizes
      NORMAL: {
        MASSIVE_MAPS_MIN: 25,    // 🔧 ADJUST: Min key size for huge maps - much bigger for readability
        MASSIVE_MAPS_MAX: 70,    // 🔧 ADJUST: Max key size for huge maps - much bigger
        LARGE_MAPS_MIN: 30,      // 🔧 ADJUST: Min key size for large maps - much bigger for readability
        LARGE_MAPS_MAX: 80,      // 🔧 ADJUST: Max key size for large maps - much bigger
        MEDIUM_MAPS_MIN: 35,     // 🔧 ADJUST: Min key size for medium maps - much bigger for readability
        MEDIUM_MAPS_MAX: 90,     // 🔧 ADJUST: Max key size for medium maps - much bigger
        SMALL_MAPS_MIN: 35,      // 🔧 ADJUST: Min key size for small maps (increased from 25)
        SMALL_MAPS_MAX: 100,     // 🔧 ADJUST: Max key size for small maps (increased from 70)
      },
      // Fullscreen mode key sizes
      FULLSCREEN: {
        MASSIVE_MAPS_MIN: 35,    // 🔧 ADJUST: Min key size for huge maps in fullscreen - much bigger
        MASSIVE_MAPS_MAX: 120,   // 🔧 ADJUST: Max key size for huge maps in fullscreen - much bigger
        LARGE_MAPS_MIN: 40,      // 🔧 ADJUST: Min key size for large maps in fullscreen - much bigger
        LARGE_MAPS_MAX: 140,     // 🔧 ADJUST: Max key size for large maps in fullscreen - much bigger
        MEDIUM_MAPS_MIN: 45,     // 🔧 ADJUST: Min key size for medium maps in fullscreen - much bigger
        MEDIUM_MAPS_MAX: 160,    // 🔧 ADJUST: Max key size for medium maps in fullscreen - much bigger
        SMALL_MAPS_MIN: 50,      // 🔧 ADJUST: Min key size for small maps in fullscreen (increased from 35)
        SMALL_MAPS_MAX: 180,     // 🔧 ADJUST: Max key size for small maps in fullscreen - much bigger
      }
    },
    
    // 📐 GAP SIZES - Spaces between keys
    GAPS: {
      MASSIVE_MAPS: 1,         // 🔧 ADJUST: Gap for huge maps (1000+ cells) (default: 1)
      LARGE_MAPS: 2,           // 🔧 ADJUST: Gap for large maps (500+ cells) (default: 2)
      MEDIUM_MAPS: 4,          // 🔧 ADJUST: Gap for medium maps (200+ cells) (default: 4)
      SMALL_MAPS: 6,           // 🔧 ADJUST: Gap for small maps (default: 6)
    },
    
    // ⚖️ SAFETY FACTORS - Lower = bigger elements, Higher = smaller elements
    SAFETY_FACTORS: {
      MASSIVE_MAPS: 0.85,      // 🔧 ADJUST: Safety factor for huge maps (default: 0.85)
      LARGE_MAPS: 0.90,        // 🔧 ADJUST: Safety factor for large maps (default: 0.90)
      MEDIUM_MAPS: 0.92,       // 🔧 ADJUST: Safety factor for medium maps (default: 0.92)
      SMALL_MAPS: 0.95,        // 🔧 ADJUST: Safety factor for small maps (default: 0.95)
      EMERGENCY: 0.80,         // 🔧 ADJUST: Emergency safety factor when map overflows (default: 0.80)
    },
    
    // 🎯 MAP COMPLEXITY THRESHOLDS - When to switch between size categories
    COMPLEXITY_THRESHOLDS: {
      MASSIVE: 1500,           // 🔧 ADJUST: Cells count for "massive" maps (default: 1500)
      LARGE: 800,              // 🔧 ADJUST: Cells count for "large" maps (default: 800)
      MEDIUM: 400,             // 🔧 ADJUST: Cells count for "medium" maps (default: 400)
      // Everything below MEDIUM is considered "small"
    }
  }
};

// ================================
// 🎮 QUICK SCALING PRESETS
// Uncomment one of these to quickly change scaling behavior!
// ================================

// 🔧 ULTRA CONSERVATIVE SAFETY FACTORS - Absolutely prevent overflow
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.MASSIVE_MAPS = 0.35;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.LARGE_MAPS = 0.40;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.MEDIUM_MAPS = 0.50;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.SMALL_MAPS = 0.65;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.MASSIVE_MAPS_MAX = 70;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.LARGE_MAPS_MAX = 80;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.MEDIUM_MAPS_MAX = 90;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.SMALL_MAPS_MAX = 100;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.FULLSCREEN.MASSIVE_MAPS_MAX = 120;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.FULLSCREEN.LARGE_MAPS_MAX = 140;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.FULLSCREEN.MEDIUM_MAPS_MAX = 160;
RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.FULLSCREEN.SMALL_MAPS_MAX = 180;

// 🔧 Uncomment this for SMALLER elements (more conservative)
// RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.MASSIVE_MAPS = 0.75;
// RESPONSIVE_CONFIG.ADAPTIVE_SCALING.SAFETY_FACTORS.LARGE_MAPS = 0.80;
// RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.MASSIVE_MAPS_MAX = 15;
// RESPONSIVE_CONFIG.ADAPTIVE_SCALING.KEY_SIZES.NORMAL.LARGE_MAPS_MAX = 25;