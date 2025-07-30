// Event handling logic for leaderboard modal
export class EventHandlers {
  constructor(modal, options = {}) {
    this.modal = modal;
    this.multiplayerMode = options.multiplayerMode || false;
    this.showMapNavigation = options.showMapNavigation || false;
    this.showModeToggle = options.showModeToggle || false;
    this.onClose = options.onClose || null;
    this.loadLeaderboard = options.loadLeaderboard || (() => {});
    this.updateMode = options.updateMode || (() => {});
  }

  setupEventHandlers() {
    this.setupCloseHandlers();
    this.setupModalClickHandler();
    this.setupEscapeKeyHandler();
    
    if (this.showMapNavigation && !this.multiplayerMode) {
      this.setupMapNavigation();
    }
    
    if (this.showMapNavigation && this.showModeToggle) {
      this.setupToggleButton();
    }
  }

  setupCloseHandlers() {
    const closeFooterBtn = this.modal.querySelector(".close-modal-footer");

    if (closeFooterBtn) {
      closeFooterBtn.onclick = () => {
        this.close();
        return false;
      };
      closeFooterBtn.addEventListener("click", () => this.close());
    }
  }

  setupModalClickHandler() {
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  setupEscapeKeyHandler() {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        this.close();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }

  setupMapNavigation() {
    this.modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("footer-map-btn")) {
        const mapId = parseInt(e.target.dataset.map);
        if (mapId) {
          this.loadLeaderboard(mapId);
        }
      }
    });
  }

  setupToggleButton() {
    const toggleButton = this.modal.querySelector("#leaderboardModeToggle");
    if (!toggleButton) return;

    const updateToggleButton = (isMultiplayerMode) => {
      if (isMultiplayerMode) {
        toggleButton.textContent = "🎮 Multiplayer Mode";
        toggleButton.style.background = "#e67e22";
      } else {
        toggleButton.textContent = "🏆 Normal Mode";
        toggleButton.style.background = "#3498db";
      }
    };

    updateToggleButton(this.multiplayerMode);

    toggleButton.addEventListener("click", () => {
      this.multiplayerMode = !this.multiplayerMode;
      updateToggleButton(this.multiplayerMode);

      // Update the parent modal's mode and reinitialize modules
      this.updateMode(this.multiplayerMode);

      // Update title
      const titleElement = this.modal.querySelector(".leaderboard-title");
      if (titleElement) {
        const currentMapName = titleElement.textContent.split(" - ")[1] || "Map 1";
        titleElement.textContent = this.multiplayerMode 
          ? `🏆 Multiplayer Leaderboard`
          : `🏆 Leaderboard - ${currentMapName}`;
      }

      // Toggle footer map buttons visibility
      const footerMapButtons = this.modal.querySelector(".footer-map-buttons");
      if (footerMapButtons) {
        footerMapButtons.style.display = this.multiplayerMode ? "none" : "block";
      }

      // Reload leaderboard with current map
      const mapId = this.getCurrentMapId();
      this.loadLeaderboard(mapId);
    });
  }

  getCurrentMapId() {
    // Try to extract map ID from current context or default to 1
    const titleElement = this.modal.querySelector(".leaderboard-title");
    if (titleElement && (titleElement.textContent.includes("Map 1") || titleElement.textContent.includes("Welcome to Boba"))) {
      return 1;
    }
    return 1; // Default map ID
  }

  close() {
    if (this.modal) {
      this.modal.style.animation = "fadeOut 0.3s ease";
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        if (this.onClose) {
          this.onClose();
        }
      }, 300);
    }
  }
}