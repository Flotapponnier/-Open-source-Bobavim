import { initializePlayButton } from "./index_js_modules/playButton.js";
import { initializeMapLeaderboardButton } from "./index_js_modules/mapLeaderboard.js";
import { initializeOnlineButton } from "./index_js_modules/onlineButton_websocket.js";
import { initializeCharacterSelection } from "./index_js_modules/characterSelection.js";
import { initializeAuth } from "./index_js_modules/auth.js";
import { initializeUserSettings } from "./index_js_modules/userSettings.js";
import { initializeVimManual } from "./vimManual.js";
import { initializeSurvey } from "./index_js_modules/survey.js";
import { initializeNewsletter } from "./index_js_modules/newsletter.js";
import { initializePaymentModal } from "./index_js_modules/paymentModal.js";
import { musicManager } from "./index_js_modules/music.js";
import {
  initializeDisplayTips,
  displayRandomTip,
} from "./index_js_modules/displayTips.js";

document.addEventListener("DOMContentLoaded", async function () {
  logger.debug("Initializing index page modules...");

  // Initialize core modules
  initializeDisplayTips();
  initializeAuth();
  initializeUserSettings();
  initializeCharacterSelection();
  initializePaymentModal();

  // Initialize button modules
  initializePlayButton();
  initializeOnlineButton();
  initializeMapLeaderboardButton();
  initializeVimManual();
  await initializeSurvey();
  initializeNewsletter();
  
  // Initialize music (musicManager initializes itself via import)

  // Display random tip
  displayRandomTip();

  // Check for confirmation messages in URL parameters
  checkForConfirmationMessages();

  logger.debug("All index modules initialized successfully");
});

// Love Letter Modal Functions
window.openLoveLetterModal = function() {
  const modal = document.getElementById('loveLetterModal');
  if (modal) {
    modal.classList.remove('hidden');
    loadSupporters();
  }
};

window.closeLoveLetterModal = function() {
  const modal = document.getElementById('loveLetterModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

// Close modal when clicking outside of it
document.addEventListener('click', function(event) {
  const modal = document.getElementById('loveLetterModal');
  if (modal && event.target === modal) {
    window.closeLoveLetterModal();
  }
});

// Load supporters for love letter modal
async function loadSupporters() {
  const loadingDiv = document.querySelector('.supporters-loading');
  const supportersDiv = document.querySelector('.supporters-list');
  
  if (!loadingDiv || !supportersDiv) return;
  
  try {
    const response = await fetch('/api/supporters');
    const data = await response.json();
    
    if (data.success && data.supporters.length > 0) {
      // Sort supporters by level (highest to lowest)
      const sortedSupporters = data.supporters.sort((a, b) => {
        const levelA = parseInt(a.level) || 0;
        const levelB = parseInt(b.level) || 0;
        return levelB - levelA;
      });
      
      let supportersHTML = '<div class="supporters-container">';
      
      sortedSupporters.forEach(supporter => {
        const levelNum = parseInt(supporter.level) || 0;
        supportersHTML += `
          <div class="supporter-entry">
            <div class="supporter-info">
              <div class="supporter-avatar-section">
                <img src="/static/sprites/avatar/diamond_boba_avatar.png" class="supporter-avatar" alt="Diamond Boba Avatar">
                <div>
                  <div class="supporter-name">${escapeHtml(supporter.username)}</div>
                  <div class="supporter-level">LEVEL ${levelNum}</div>
                </div>
              </div>
              <div class="level-badge">LVL ${levelNum}</div>
            </div>
            ${supporter.message ? `<div class="supporter-message"><p>${escapeHtml(supporter.message)}</p></div>` : ''}
          </div>
        `;
      });
      
      supportersHTML += '</div>';
      supportersDiv.innerHTML = supportersHTML;
    } else {
      supportersDiv.innerHTML = '<div class="no-supporters">No supporters yet. Be the first to support Boba.vim!</div>';
    }
    
    // Show supporters and hide loading
    loadingDiv.classList.add('hidden');
    supportersDiv.classList.remove('hidden');
  } catch (error) {
    logger.error('Error loading supporters:', error);
    supportersDiv.innerHTML = '<div class="error-message">Error loading supporters. Please try again later.</div>';
    loadingDiv.classList.add('hidden');
    supportersDiv.classList.remove('hidden');
  }
}

// HTML escape function for security
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    window.closeLoveLetterModal();
  }
});

function checkForConfirmationMessages() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('confirmed')) {
    showConfirmationMessage("✅ Email confirmed successfully!", "success");
    // Remove the parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.has('error')) {
    const error = urlParams.get('error');
    let message = "❌ Error confirming email";
    
    switch (error) {
      case 'missing_token':
        message = "❌ Missing confirmation token";
        break;
      case 'invalid_token':
        message = "❌ Invalid confirmation token";
        break;
      case 'expired_token':
        message = "❌ Confirmation token has expired";
        break;
      case 'server_error':
        message = "❌ Server error during confirmation";
        break;
    }
    
    showConfirmationMessage(message, "error");
    // Remove the parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function showConfirmationMessage(message, type) {
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ${type === 'success' 
      ? 'background: linear-gradient(45deg, #27ae60, #2ecc71);' 
      : 'background: linear-gradient(45deg, #e74c3c, #c0392b);'
    }
  `;
  
  messageDiv.textContent = message;
  
  // Add animation keyframes
  if (!document.getElementById('confirmationMessageStyles')) {
    const style = document.createElement('style');
    style.id = 'confirmationMessageStyles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(messageDiv);
  
  // Remove message after 5 seconds
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 5000);
}
