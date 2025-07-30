// Modal creation and management for leaderboard
export class ModalManager {
  constructor() {
    this.modal = null;
  }

  createModalOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "leaderboard-modal-overlay";
    
    // Check if we're in a game completion context (higher z-index needed)
    const hasCompletionModal = document.querySelector('.completion-modal') || 
                               document.querySelector('#completionModal') ||
                               document.querySelector('[id*="completion"]');
    const zIndex = hasCompletionModal ? 10001 : 1000;
    
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: ${zIndex};
      animation: fadeIn 0.3s ease;
    `;
    return overlay;
  }

  createModalContent(title, showModeToggle) {
    const modal = document.createElement("div");
    modal.className = "leaderboard-modal";
    
    // Responsive modal sizing
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    
    modal.style.cssText = `
      background: #2c3e50;
      color: white;
      border-radius: 10px;
      padding: ${isSmallMobile ? '0.8rem' : isMobile ? '1rem' : '1.2rem'};
      max-width: ${isSmallMobile ? '98%' : isMobile ? '95%' : '950px'};
      width: ${isSmallMobile ? '98%' : isMobile ? '95%' : '96%'};
      height: ${isSmallMobile ? '95vh' : isMobile ? '93vh' : '92vh'};
      max-height: ${isSmallMobile ? '95vh' : isMobile ? '93vh' : '92vh'};
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: slideIn 0.3s ease;
      position: relative;
      overflow: hidden;
    `;

    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="leaderboard-title">${title}</h2>
        ${showModeToggle ? `
          <div class="toggle-container">
            <button id="leaderboardModeToggle" class="eightbit-btn">
              🏆 Normal Mode
            </button>
          </div>
        ` : ''}
        <div class="player-position-section"></div>
      </div>
      <div class="main-content">
        <div class="leaderboard-content">
          <div class="loading-spinner">
            <div>Loading leaderboard...</div>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  createMapNavigationFooter(availableMaps) {
    return `
      <div class="modal-footer">
        <div class="footer-map-buttons">
          <div class="map-grid">
            ${availableMaps.map(map => `
              <button class="footer-map-btn eightbit-leaderboard-btn" data-map="${map.id}">
                ${map.name}
              </button>
            `).join("")}
          </div>
        </div>
        <div style="text-align: center; flex-shrink: 0;">
          <button class="close-modal-footer eightbit-btn eightbit-close-btn">Close</button>
        </div>
      </div>
    `;
  }

  createSimpleFooter() {
    return `
      <div class="modal-footer">
        <div style="text-align: center;">
          <button class="close-modal-footer eightbit-btn eightbit-close-btn">Close</button>
        </div>
      </div>
    `;
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.animation = "fadeOut 0.3s ease";
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
      }, 300);
    }
  }
}