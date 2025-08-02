import { COMPLETION_CONFIG } from "../../game_js_modules/constants_js_modules/gameCompletion.js";
import { LeaderboardModal } from "../../leaderboard/leaderboard.js";
import { gameSoundEffectsManager } from "../../game_js_modules/gameSoundEffects.js";
import { initializeMultiplayerCompletionVim, disableMultiplayerCompletionVim } from "./multiplayerCompletionVimNavigation.js";

export class GameCompletionHandler {
  constructor(game) {
    this.game = game;
  }

  handleGameCompletion(data) {
    logger.debug('🏆 MULTIPLAYER GAME COMPLETION:', data);
    
    // Play game completion sound
    gameSoundEffectsManager.playGameCompleteSound();
    
    this.game.isConnected = false;
    if (this.game.websocket) {
      this.game.websocket.close();
      this.game.websocket = null;
    }
    
    this.showUnifiedCompletionModal(data);
  }

  handlePlayerDisconnection(data) {
    logger.debug('📡 PLAYER DISCONNECTION:', data);
    
    this.game.isConnected = false;
    if (this.game.websocket) {
      this.game.websocket.close();
      this.game.websocket = null;
    }
    
    this.showUnifiedCompletionModal({
      type: 'disconnection',
      winner: 'disconnection',
      reason: data.reason || 'Player disconnected',
      message: data.message || 'Game ended due to disconnection',
      player1: this.game.clientGameState?.player1,
      player2: this.game.clientGameState?.player2,
      isWinner: false
    });
  }

  handleGameTimeout(data) {
    logger.debug('⏰ GAME TIMEOUT:', data);
    
    // Play timeout sound
    gameSoundEffectsManager.playTimeoutSound();
    
    this.game.isConnected = false;
    if (this.game.websocket) {
      this.game.websocket.close();
      this.game.websocket = null;
    }
    
    this.showUnifiedCompletionModal({
      type: 'timeout',
      winner: 'timeout',
      reason: 'Game timed out (8 minutes)',
      message: 'Time limit exceeded',
      player1: this.game.clientGameState?.player1,
      player2: this.game.clientGameState?.player2,
      isWinner: false
    });
  }

  showUnifiedCompletionModal(data) {
    logger.debug('🎉 SHOWING UNIFIED COMPLETION MODAL:', data);
    
    // Remove any existing completion modal first
    const existingModal = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.COMPLETION_MODAL);
    if (existingModal) {
      existingModal.remove();
      logger.debug('Removed existing completion modal');
    }
    
    // Determine completion type and messages
    const completionInfo = this.getCompletionInfo(data);
    
    // Create the unified completion modal with same structure as solo game
    const modalHTML = this.createCompletionModalHTML(completionInfo, data);
    
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    
    // Setup event handlers
    this.setupMultiplayerCompletionHandlers(data);
    
    // Initialize vim navigation for multiplayer completion
    setTimeout(() => {
      initializeMultiplayerCompletionVim();
    }, 200);
  }

  getCompletionInfo(data) {
    const isWinner = data.winner === this.game.playerId;
    
    let title, message, titleColor;
    
    switch (data.type || (data.winner === 'disconnection' ? 'disconnection' : data.winner === 'timeout' ? 'timeout' : 'normal')) {
      case 'disconnection':
        title = 'Game Ended';
        message = data.reason || 'Player disconnected';
        titleColor = '#95a5a6';
        break;
      case 'timeout':
        title = 'Time Up!';
        message = 'Game timed out (8 minutes)';
        titleColor = '#e67e22';
        break;
      default:
        title = isWinner ? 'Victory!' : 'Defeat';
        message = isWinner ? 'You Win!' : 'You Lose!';
        titleColor = isWinner ? '#2ecc71' : '#e74c3c';
        break;
    }
    
    return { title, message, titleColor, isWinner };
  }

  createCompletionModalHTML(completionInfo, data) {
    const player1 = data.player1 || this.game.clientGameState?.player1 || { username: 'Player 1', score: 0, character: 'boba' };
    const player2 = data.player2 || this.game.clientGameState?.player2 || { username: 'Player 2', score: 0, character: 'boba' };
    
    const currentPlayerCharacter = this.getCurrentPlayerCharacter();
    
    return `
      <div id="${COMPLETION_CONFIG.ELEMENT_IDS.COMPLETION_MODAL}" style="${this.getModalStyle()}">
        <div style="${this.getContentStyle()}">
          <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem;">
            ${this.createAvatarHTML(currentPlayerCharacter)}
            <h2 style="color: ${completionInfo.titleColor}; margin: 0; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">${completionInfo.title}</h2>
          </div>
          
          <div style="margin: 1.5rem 0;">
            <p style="margin: 0.8rem 0; font-size: 18px; color: ${completionInfo.titleColor};">
              <strong>${completionInfo.message}</strong>
            </p>
            
            <div style="margin: 1.5rem 0; padding: 1rem; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
              <h3 style="color: #ecf0f1; margin: 0 0 1rem 0; text-align: center;">Final Scores</h3>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 2rem;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                  ${this.createAvatarHTML(player1.character || 'boba')}
                  <span style="color: #ecf0f1; font-weight: bold;">${player1.username}</span>
                  <span style="color: #2ecc71; font-size: 18px; font-weight: bold;">${player1.score || 0}</span>
                </div>
                
                <div style="color: #95a5a6; font-size: 24px; font-weight: bold;">VS</div>
                
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                  ${this.createAvatarHTML(player2.character || 'boba')}
                  <span style="color: #ecf0f1; font-weight: bold;">${player2.username}</span>
                  <span style="color: #2ecc71; font-size: 18px; font-weight: bold;">${player2.score || 0}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style="${this.getButtonContainerStyle()}">
            ${this.createButton(COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD, COMPLETION_CONFIG.BUTTONS.LEADERBOARD, COMPLETION_CONFIG.GRADIENTS.LEADERBOARD)}
            ${this.createButton(COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU, COMPLETION_CONFIG.BUTTONS.BACK_MENU, COMPLETION_CONFIG.GRADIENTS.BACK_MENU)}
          </div>
        </div>
      </div>
    `;
  }

  getCurrentPlayerCharacter() {
    // Try to get from game state first
    if (this.game.clientGameState) {
      const isPlayer1 = this.game.playerId === this.game.clientGameState.player1?.id;
      const currentPlayer = isPlayer1 ? this.game.clientGameState.player1 : this.game.clientGameState.player2;
      if (currentPlayer?.character) {
        return currentPlayer.character;
      }
    }
    
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem("boba_vim_selected_character");
      if (saved && ["boba", "pinky", "golden", "black", "boba_diamond"].includes(saved)) {
        return saved;
      }
    } catch (error) {
      logger.warn("Failed to load character from localStorage:", error);
    }
    
    return 'boba'; // Default fallback
  }

  setupMultiplayerCompletionHandlers(data) {
    const self = this;
    
    // Use multiple approaches to ensure DOM is ready
    const setupHandlers = () => {
      logger.debug('Setting up multiplayer completion handlers...');
      
      // Leaderboard button
      const leaderboardButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD);
      logger.debug("Leaderboard button found:", leaderboardButton);
      if (leaderboardButton) {
        // Remove any existing listeners first
        leaderboardButton.removeEventListener("click", self.leaderboardClickHandler);
        
        // Create bound handler for proper cleanup
        self.leaderboardClickHandler = function(e) {
          logger.debug("Leaderboard button clicked - data:", data);
          self.showMultiplayerLeaderboard();
          return false;
        };
        
        // Add click handler using only addEventListener to avoid duplicate events
        leaderboardButton.addEventListener("click", self.leaderboardClickHandler, { passive: false });
        
        logger.debug("Leaderboard button handlers set up");
      } else {
        logger.warn("Leaderboard button not found!");
      }

      // Back to menu button
      const backToMenuButton = document.getElementById(COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU);
      logger.debug("Back to menu button found:", backToMenuButton);
      if (backToMenuButton) {
        // Remove any existing listeners first
        backToMenuButton.removeEventListener("click", self.backToMenuClickHandler);
        
        // Create bound handler for proper cleanup
        self.backToMenuClickHandler = function(e) {
          logger.debug("Back to menu button clicked - data:", data);
          logger.debug("Redirecting to:", COMPLETION_CONFIG.NAVIGATION.MENU_URL);
          window.location.href = COMPLETION_CONFIG.NAVIGATION.MENU_URL;
          return false;
        };
        
        // Add click handler using only addEventListener to avoid duplicate events
        backToMenuButton.addEventListener("click", self.backToMenuClickHandler, { passive: false });
        
        logger.debug("Back to menu button handlers set up");
      } else {
        logger.warn("Back to menu button not found!");
      }

      // Setup hover effects
      self.setupHoverEffects([
        {
          id: COMPLETION_CONFIG.ELEMENT_IDS.VIEW_LEADERBOARD,
          text: COMPLETION_CONFIG.BUTTONS.LEADERBOARD,
        },
        {
          id: COMPLETION_CONFIG.ELEMENT_IDS.BACK_TO_MENU,
          text: COMPLETION_CONFIG.BUTTONS.BACK_MENU,
        },
      ]);
    };
    
    // Try multiple timing approaches for maximum compatibility
    requestAnimationFrame(setupHandlers);
    setTimeout(setupHandlers, 100);
    setTimeout(setupHandlers, 300);
  }

  async showMultiplayerLeaderboard() {
    logger.debug("showMultiplayerLeaderboard called");

    // Disable multiplayer completion vim navigation before opening leaderboard
    disableMultiplayerCompletionVim();

    // Hide the completion modal temporarily
    const completionModal = document.getElementById('completionModal');
    if (completionModal) {
      completionModal.style.display = 'none';
    }

    const leaderboardModal = new LeaderboardModal();
    await leaderboardModal.show({
      currentMapInfo: { id: 1, name: "Welcome to Boba" }, // Default map info
      availableMaps: [],
      showMapNavigation: true, // Enable navigation
      multiplayerMode: true, // Start in multiplayer mode
      showModeToggle: false, // Hide mode toggle button in game completion
      onClose: () => {
        // Show completion modal again when leaderboard is closed
        const completionModal = document.getElementById('completionModal');
        if (completionModal) {
          completionModal.style.display = 'flex';
          // Re-initialize vim navigation when coming back to completion
          setTimeout(() => {
            initializeMultiplayerCompletionVim();
          }, 100);
        }
      }
    });
  }

  // Helper methods using same structure as solo game completion
  getModalStyle() {
    return `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${COMPLETION_CONFIG.COLORS.OVERLAY};
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: ${COMPLETION_CONFIG.MODAL.Z_INDEX};
    `;
  }

  getContentStyle() {
    return `
      background: ${COMPLETION_CONFIG.COLORS.MODAL_BG};
      color: white;
      padding: 2rem;
      border-radius: 10px;
      text-align: center;
      max-width: 600px;
      width: 95%;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: ${COMPLETION_CONFIG.SHADOWS.MODAL};
      margin-top: 8vh;
    `;
  }

  getButtonContainerStyle() {
    return `
      margin: 2rem 0;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: center;
    `;
  }

  createButton(id, label, gradient) {
    const buttonClass = this.getButtonClass(id);
    return `<button id="${id}" class="eightbit-completion-btn ${buttonClass}">${label}</button>`;
  }

  getButtonClass(id) {
    if (id === 'viewLeaderboard') return 'leaderboard';
    if (id === 'backToMenu') return 'menu';
    if (id === 'nextMap' || id === 'previousMap') return 'navigation';
    return ''; // Default green style
  }

  createAvatarHTML(character) {
    const avatarSrc = this.getAvatarSpritePath(character);

    return `
      <img 
        src="${avatarSrc}" 
        alt="${character} avatar" 
        style="
          width: 48px; 
          height: 48px; 
          border-radius: 8px;
          border: 3px solid #654321;
          box-shadow: 
            inset 2px 2px 4px rgba(255, 255, 255, 0.15),
            inset -2px -2px 4px rgba(0, 0, 0, 0.4),
            0 4px 8px rgba(0, 0, 0, 0.3);
          background: linear-gradient(145deg, #8b4513, #a0522d, #d2691e);
          padding: 2px;
        "
      />
    `;
  }

  getAvatarSpritePath(character) {
    switch (character) {
      case "pinky":
        return "/static/sprites/avatar/pinky_boba_avatar.png";
      case "golden":
        return "/static/sprites/avatar/golden_boba_avatar.png";
      case "black":
        return "/static/sprites/avatar/black_boba_avatar.png";
      case "boba_diamond":
        return "/static/sprites/avatar/diamond_boba_avatar.png";
      case "boba":
      default:
        return "/static/sprites/avatar/boba_avatar.png";
    }
  }

  setupHoverEffects(buttons) {
    for (let i = 0; i < buttons.length; i++) {
      const buttonConfig = buttons[i];
      const btn = document.getElementById(buttonConfig.id);
      if (!btn) continue;
      
      const originalText = buttonConfig.text;
      
      btn.addEventListener("mouseenter", function(e) {
        // Don't interfere with click events
        if (e.type === "mouseenter") {
          btn.textContent = COMPLETION_CONFIG.BUTTONS.HOVER_ICON;
          btn.style.transform = "translateY(-3px) scale(1.05)";
        }
      }, { passive: true });
      
      btn.addEventListener("mouseleave", function(e) {
        // Don't interfere with click events
        if (e.type === "mouseleave") {
          btn.textContent = originalText;
          btn.style.transform = "translateY(0) scale(1)";
        }
      }, { passive: true });
    }
  }

  // Legacy methods for backward compatibility
  showCompletionModal(data) {
    this.showUnifiedCompletionModal(data);
  }

  showGameCompletionMessage(data) {
    this.showUnifiedCompletionModal(data);
  }
}