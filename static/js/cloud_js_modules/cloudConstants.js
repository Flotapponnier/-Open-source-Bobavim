// ================================
// CLOUD SYSTEM CONFIGURATION
// ================================

export const CLOUD_CONFIG = {
  COUNT: 12,
  SIZES: ["small", "medium", "large"],
  IMAGES: [
    "cloud1.png",
    "cloud2.png", 
    "cloud3.png",
    "cloud4.png",
    "cloud5.png",
    "cloud6.png",
    "cloud7.png",
    "cloud8.png",
    "cloud9.png"
  ],
  POSITIONING: {
    TOP_RANGE: 80,
    TOP_OFFSET: 5,
  },
  OPACITY: {
    MIN: 0.4,
    MAX: 0.4,  // Adding 0.4 range to min
  },
  ANIMATION: {
    MIN_DURATION: 35,
    MAX_DURATION: 40,
  },
  PATHS: {
    SPRITE_DIRECTORY: "/static/sprites/clouds/",
  },
  TIMING: {
    INIT_DELAY: 100,
  },
};

export const CLOUD_CSS_CLASSES = {
  CONTAINER: "clouds-container",
  BASE: "cloud",
  SMALL: "cloud-small", 
  MEDIUM: "cloud-medium",
  LARGE: "cloud-large",
};