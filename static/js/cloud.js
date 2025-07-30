import {
  CLOUD_CONFIG,
  CLOUD_CSS_CLASSES,
} from "./cloud_js_modules/cloudConstants.js";

class CloudManager {
  constructor() {
    this.cloudImages = CLOUD_CONFIG.IMAGES;
    this.cloudSizes = CLOUD_CONFIG.SIZES;
    this.cloudsContainer = null;
    this.cloudCount = CLOUD_CONFIG.COUNT;
  }

  init() {
    this.createCloudsContainer();
    this.generateClouds();
    logger.debug("🌤️ Cloud system initialized with", this.cloudCount, "clouds");
  }

  createCloudsContainer() {
    const existing = document.querySelector(`.${CLOUD_CSS_CLASSES.CONTAINER}`);
    if (existing) {
      existing.remove();
    }

    this.cloudsContainer = document.createElement("div");
    this.cloudsContainer.className = CLOUD_CSS_CLASSES.CONTAINER;
    document.body.insertBefore(this.cloudsContainer, document.body.firstChild);
  }

  generateClouds() {
    for (let i = 1; i <= this.cloudCount; i++) {
      const cloud = this.createCloudElement(i);
      this.cloudsContainer.appendChild(cloud);
    }
  }

  createCloudElement(index) {
    const cloud = document.createElement("img");

    const randomImage =
      this.cloudImages[Math.floor(Math.random() * this.cloudImages.length)];
    cloud.src = `${CLOUD_CONFIG.PATHS.SPRITE_DIRECTORY}${randomImage}`;
    cloud.alt = `Cloud ${index}`;

    const randomSize =
      this.cloudSizes[Math.floor(Math.random() * this.cloudSizes.length)];

    cloud.className = `${CLOUD_CSS_CLASSES.BASE} ${CLOUD_CSS_CLASSES.BASE}-${randomSize} ${CLOUD_CSS_CLASSES.BASE}-${index}`;

    const randomTop =
      Math.random() * CLOUD_CONFIG.POSITIONING.TOP_RANGE +
      CLOUD_CONFIG.POSITIONING.TOP_OFFSET;
    cloud.style.top = `${randomTop}%`;

    const randomOpacity =
      CLOUD_CONFIG.OPACITY.MIN + Math.random() * CLOUD_CONFIG.OPACITY.MAX;
    cloud.style.opacity = randomOpacity;

    const randomDuration =
      CLOUD_CONFIG.ANIMATION.MIN_DURATION +
      Math.random() * CLOUD_CONFIG.ANIMATION.MAX_DURATION;
    cloud.style.animationDuration = `${randomDuration}s`;

    const randomDelay = -Math.random() * randomDuration;
    cloud.style.animationDelay = `${randomDelay}s`;

    cloud.onerror = () => {
      logger.warn(`Cloud image not found: ${randomImage}`);
      cloud.style.display = "none";
    };

    return cloud;
  }

  removeClouds() {
    if (this.cloudsContainer) {
      this.cloudsContainer.remove();
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    window.cloudManager = new CloudManager();
    window.cloudManager.init();
  }, CLOUD_CONFIG.TIMING.INIT_DELAY);
});

// Export for use in other modules
export function initializeCloudAnimation() {
  const cloudManager = new CloudManager();
  cloudManager.init();
  return cloudManager;
}

// Export the class as well for backward compatibility
export { CloudManager };

window.CloudManager = CloudManager;
