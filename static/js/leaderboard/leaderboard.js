// Main leaderboard modal class - refactored and modularized
import { ModalManager } from './leaderboard_js_modules/modalManager.js';
import { DataFetcher } from './leaderboard_js_modules/dataFetcher.js';
import { HtmlGenerators } from './leaderboard_js_modules/htmlGenerators.js';
import { EventHandlers } from './leaderboard_js_modules/eventHandlers.js';
import { AuthHandlers } from './leaderboard_js_modules/authHandlers.js';
import { refreshLeaderboardNavigation, disableLeaderboardVim } from './leaderboard_js_modules/leaderboardVimNavigation.js';

export class LeaderboardModal {
  constructor() {
    this.modal = null;
    this.currentMapInfo = null;
    this.availableMaps = [];
    this.showMapNavigation = false;
    this.onClose = null;
    this.multiplayerMode = false;
    this.showModeToggle = true;
    
    // Initialize modules
    this.modalManager = new ModalManager();
    this.dataFetcher = null; // Will be initialized with multiplayerMode
    this.htmlGenerator = null; // Will be initialized with multiplayerMode
    this.eventHandlers = null; // Will be initialized with modal
    this.authHandlers = null; // Will be initialized with modal
  }

  async show(options = {}) {
    const {
      currentMapInfo = null,
      availableMaps = [],
      showMapNavigation = false,
      onClose = null,
      multiplayerMode = false,
      showModeToggle = true
    } = options;

    this.currentMapInfo = currentMapInfo;
    this.availableMaps = availableMaps;
    this.showMapNavigation = showMapNavigation;
    this.onClose = onClose;
    this.multiplayerMode = multiplayerMode;
    this.showModeToggle = showModeToggle;

    // Initialize modules with current settings
    this.dataFetcher = new DataFetcher(this.multiplayerMode);
    this.htmlGenerator = new HtmlGenerators(this.multiplayerMode);

    if (this.showMapNavigation && !this.availableMaps.length) {
      this.availableMaps = await this.dataFetcher.fetchMaps();
    }

    await this.createAndShowModal();
  }

  async createAndShowModal() {
    const modalOverlay = this.modalManager.createModalOverlay();
    const title = this.generateTitle();
    const modalContent = this.modalManager.createModalContent(title, this.showMapNavigation && this.showModeToggle);
    
    // Add footer
    const footer = this.showMapNavigation && !this.multiplayerMode 
      ? this.modalManager.createMapNavigationFooter(this.availableMaps)
      : this.modalManager.createSimpleFooter();
    
    modalContent.innerHTML += footer;
    modalOverlay.appendChild(modalContent);

    document.body.appendChild(modalOverlay);
    this.modal = modalOverlay;

    // Initialize event handlers and auth handlers
    this.eventHandlers = new EventHandlers(this.modal, {
      multiplayerMode: this.multiplayerMode,
      showMapNavigation: this.showMapNavigation,
      showModeToggle: this.showModeToggle,
      onClose: this.onClose,
      loadLeaderboard: (mapId) => this.loadLeaderboard(mapId),
      updateMode: (newMode) => this.updateMode(newMode)
    });
    
    this.authHandlers = new AuthHandlers(this.modal, () => this.close());

    this.setupEventHandlers();
    
    // Hide footer map buttons if starting in multiplayer mode
    if (this.showMapNavigation && this.multiplayerMode) {
      const footerMapButtons = this.modal.querySelector(".footer-map-buttons");
      if (footerMapButtons) {
        footerMapButtons.style.display = "none";
      }
    }
    
    if (this.showMapNavigation) {
      await this.loadLeaderboard(this.currentMapInfo?.id || 1);
    } else {
      await this.loadLeaderboard(this.currentMapInfo?.id);
    }
  }

  updateMode(newMode) {
    this.multiplayerMode = newMode;
    
    // Reinitialize DataFetcher and HtmlGenerators with new mode
    this.dataFetcher = new DataFetcher(this.multiplayerMode);
    this.htmlGenerator = new HtmlGenerators(this.multiplayerMode);
  }

  generateTitle() {
    return this.multiplayerMode 
      ? `🏆 Multiplayer Leaderboard`
      : this.showMapNavigation 
        ? `🏆 Leaderboard - ${this.currentMapInfo?.name || "Map 1"}`
        : `🏆 ${this.currentMapInfo?.name || "Leaderboard"} - Leaderboard`;
  }

  setupEventHandlers() {
    this.eventHandlers.setupEventHandlers();
    this.authHandlers.setupGuestEventListeners();
  }

  async loadLeaderboard(mapId) {
    const content = this.modal.querySelector(".leaderboard-content");
    const modalHeader = this.modal.querySelector(".modal-header");
    const playerPositionDiv = modalHeader.querySelector(".player-position-section");

    // Update the title with the correct map name when switching maps
    if (mapId && this.availableMaps.length > 0) {
      const selectedMap = this.availableMaps.find(map => map.id === mapId);
      if (selectedMap) {
        this.currentMapInfo = selectedMap;
        const titleElement = this.modal.querySelector(".leaderboard-title");
        if (titleElement && !this.multiplayerMode) {
          titleElement.textContent = `🏆 Leaderboard - ${selectedMap.name}`;
        }
      }
    }

    // Clear existing content
    content.innerHTML = '<div class="loading-spinner"><div>Loading leaderboard...</div></div>';
    
    // Clear previous player position data when switching maps
    if (playerPositionDiv) {
      playerPositionDiv.innerHTML = '';
    }
    
    // Remove any existing unconfirmed user message
    const existingMessage = modalHeader.querySelector(".unconfirmed-user-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    try {
      const leaderboardData = await this.dataFetcher.fetchLeaderboardData(mapId);
      
      if (leaderboardData.success) {
        // Handle different data formats for single-player vs multiplayer
        const leaderboardArray = this.multiplayerMode 
          ? (leaderboardData.data || [])
          : (leaderboardData.leaderboard || []);
        
        if (leaderboardArray.length === 0) {
          content.innerHTML = this.htmlGenerator.createEmptyLeaderboardHTML(mapId);
        } else {
          content.innerHTML = this.htmlGenerator.createLeaderboardTableHTML(leaderboardArray);
        }
        
        if (leaderboardData.player_position) {
          playerPositionDiv.innerHTML = this.htmlGenerator.createPlayerPositionHTML(leaderboardData.player_position, mapId);
        } else if (leaderboardData.unconfirmed_user) {
          // Show discrete message for both index and game completion
          this.addDiscreteAuthMessage("Confirm your account to get in the leaderboard");
        } else if (leaderboardData.is_guest) {
          // Show discrete message for both index and game completion
          this.addDiscreteAuthMessage("Create an account to get in leaderboard");
        }
        
        // Refresh vim navigation after content update
        setTimeout(() => {
          refreshLeaderboardNavigation(this.modal);
        }, 100);
      } else {
        content.innerHTML = this.htmlGenerator.createErrorHTML(leaderboardData.message || "Unknown error occurred");
      }
    } catch (error) {
      if (error.message.includes("HTTP 404")) {
        content.innerHTML = this.htmlGenerator.createEmptyLeaderboardHTML(mapId);
      } else {
        content.innerHTML = this.htmlGenerator.createErrorHTML("Unable to load leaderboard. Please try again later.");
      }
    }
  }

  addDiscreteAuthMessage(message) {
    // Try multiple possible footer selectors
    let footer = this.modal.querySelector('.modal-footer');
    if (!footer) {
      footer = this.modal.querySelector('.leaderboard-footer');
    }
    
    if (footer) {
      // Remove any existing discrete message
      const existingMessage = footer.querySelector('.discrete-auth-message');
      if (existingMessage) {
        existingMessage.remove();
      }
      
      // Create discrete message element with more visible styling
      const discreteMessage = document.createElement('div');
      discreteMessage.className = 'discrete-auth-message';
      discreteMessage.style.cssText = `
        position: absolute;
        top: -25px;
        right: 10px;
        background: linear-gradient(45deg, #e67e22, #d35400);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        border: 2px solid #f39c12;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        z-index: 1000;
        white-space: nowrap;
        animation: fadeIn 0.3s ease;
      `;
      discreteMessage.textContent = message;
      
      // Make footer relatively positioned to contain the absolute message
      footer.style.position = 'relative';
      footer.appendChild(discreteMessage);
    } else {
      // Fallback: add to modal header if footer not found
      const header = this.modal.querySelector('.modal-header');
      if (header) {
        const discreteMessage = document.createElement('div');
        discreteMessage.className = 'discrete-auth-message';
        discreteMessage.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: linear-gradient(45deg, #e67e22, #d35400);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
          border: 2px solid #f39c12;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
          z-index: 1000;
          white-space: nowrap;
        `;
        discreteMessage.textContent = message;
        
        header.style.position = 'relative';
        header.appendChild(discreteMessage);
      }
    }
  }

  close() {
    if (this.modal) {
      this.modal.style.animation = "fadeOut 0.3s ease";
      
      // Disable leaderboard vim navigation
      disableLeaderboardVim();
      
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

// Global function for resend confirmation (called from HTML)
window.resendConfirmationFromLeaderboard = async function() {
  // Find the current leaderboard instance and call resend
  const dataFetcher = new DataFetcher();
  await dataFetcher.resendConfirmationEmail();
};