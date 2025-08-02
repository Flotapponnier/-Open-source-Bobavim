// Payment modal for character purchases
import { CHARACTER_CONFIG } from "./index_constants/characters.js";
import { loadPlayerCharacters } from "./characterSelection.js";
import { isLoggedIn, getCurrentUser, verifyAuthenticationStatus } from "./auth.js";

// Import payment vim navigation module directly
let paymentVimModule = null;
import('./paymentVimNavigation.js').then(module => {
  paymentVimModule = module;
  logger.debug('Payment: paymentVimNavigation module loaded at startup');
}).catch(error => {
  logger.error('Payment: Failed to load paymentVimNavigation module:', error);
});

let paymentModal = null;
let stripe = null;
let elements = null;
let clientSecret = null;

// Initialize payment modal
export function initializePaymentModal() {
  createPaymentModal();
  
  // Initialize Stripe (you'll need to include Stripe.js in your HTML)
  if (window.Stripe) {
    stripe = window.Stripe(window.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key');
  }
}

function createPaymentModal() {
  paymentModal = document.createElement('div');
  paymentModal.id = 'payment-modal';
  paymentModal.className = 'payment-modal hidden';
  
  paymentModal.innerHTML = `
    <div class="payment-modal-content">
      <div class="payment-modal-header">
        <h2>Unlock Boba Diamond</h2>
        <button class="close-payment-modal" aria-label="Close">&times;</button>
      </div>
      
      <div class="payment-modal-body">
        <div class="character-preview">
          <div class="character-icon">
            <img src="/static/sprites/avatar/diamond_boba_avatar.png" alt="Diamond Boba Avatar" class="diamond-avatar">
          </div>
          <h3>UNLOCK BOBA DIAMOND</h3>
          <p class="pixel-text">Support the game and unlock this legendary character!</p>
          <div class="retro-stats">
            <div class="stat-item">
              <span class="stat-label">RARITY:</span>
              <span class="stat-value">LEGENDARY</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">POWER:</span>
              <span class="stat-value">MAXIMUM</span>
            </div>
          </div>
        </div>
        
        <div class="payment-amount-section">
          <label for="payment-amount">Choose your support amount (€):</label>
          <div class="amount-input-container">
            <input 
              type="number" 
              id="payment-amount" 
              min="1" 
              max="1000" 
              value="5"
              step="1"
            >
            <span class="currency-symbol">€</span>
          </div>
          <div class="level-display">
            <span id="character-level">Level 5</span>
            <p class="level-description">Your Boba Diamond will be <strong>Level <span id="level-number">5</span></strong></p>
          </div>
        </div>
        
        <div class="support-message-section">
          <label for="support-message">Optional message (will be shown in the love letter):</label>
          <textarea 
            id="support-message" 
            placeholder="Leave a message for the community... (optional, max 130 characters)"
            maxlength="130"
            rows="3"
          ></textarea>
          <div class="message-counter">
            <span id="message-count">0</span>/130 characters
          </div>
        </div>
        
        <div class="payment-form-section">
          <form id="payment-form">
            <div id="card-element">
              <!-- Stripe Elements will create form elements here -->
            </div>
            <div id="card-errors" role="alert"></div>
            
            <button type="submit" id="submit-payment" class="payment-button">
              <div class="button-content">
                <span class="button-icon">💳</span>
                <span id="button-text" class="button-text">
                  SECURE PAY €<span id="amount-display">5</span>
                </span>
              </div>
              <div id="payment-spinner" class="payment-spinner hidden">
                <div class="spinner"></div>
                <span class="processing-text">PROCESSING...</span>
              </div>
            </button>
          </form>
        </div>
        
        <div id="payment-messages" class="payment-messages">
          <div id="payment-error" class="payment-error hidden">
            <div class="error-header">
              <span class="error-icon">⚠</span>
              <span class="error-title">PAYMENT FAILED</span>
            </div>
            <div class="error-content">
              <p id="error-message" class="error-text">Please check your payment information and try again.</p>
              <button id="retry-payment" class="retry-button">TRY AGAIN</button>
            </div>
          </div>
          
          <div id="payment-success" class="payment-success hidden">
            <div class="success-header">
              <span class="success-icon">✓</span>
              <span class="success-title">PAYMENT SUCCESSFUL</span>
            </div>
            <div class="success-content">
              <p class="success-text">Diamond Boba unlocked! Welcome to the elite!</p>
            </div>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="security-badge">
            <span class="security-icon">SECURE</span>
            <span class="security-text">Payment powered by Stripe</span>
          </div>
          <div class="info-item">
            <span class="info-label">PURPOSE:</span>
            <span class="info-text">Support game development</span>
          </div>
          <div class="info-item">
            <span class="info-label">DELIVERY:</span>
            <span class="info-text">Character unlocks immediately</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(paymentModal);
  
  // Add event listeners
  const closeBtn = paymentModal.querySelector('.close-payment-modal');
  const amountInput = paymentModal.querySelector('#payment-amount');
  const paymentForm = paymentModal.querySelector('#payment-form');
  const supportMessage = paymentModal.querySelector('#support-message');
  
  closeBtn.addEventListener('click', hidePaymentModal);
  amountInput.addEventListener('input', updateAmountDisplay);
  supportMessage.addEventListener('input', updateMessageCounter);
  paymentForm.addEventListener('submit', handlePaymentSubmit);
  
  // Close modal when clicking outside
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
      hidePaymentModal();
    }
  });
}

export function showPaymentModal(characterName) {
  if (characterName !== 'boba_diamond') {
    logger.warn('Payment modal only supports boba_diamond character');
    return;
  }
  
  // Check if user is logged in before showing payment modal
  if (!isLoggedIn()) {
    logger.error('User must be logged in to purchase characters');
    alert('Please log in first to purchase characters.');
    return;
  }
  
  paymentModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  
  // Disable main vim navigation when payment modal is open
  if (window.hideCursor) {
    window.hideCursor();
    // Also disable the navigation completely for true modals
    setTimeout(() => {
      if (window.disableVimNavigation) {
        window.disableVimNavigation();
      }
    }, 0);
  }
  
  // Initialize Stripe elements if not already done
  if (stripe && !elements) {
    initializeStripeElements();
  }
  
  // Reset form
  resetPaymentForm();
  
  // Initialize payment vim navigation with longer delay for animations and Stripe setup
  setTimeout(() => {
    logger.debug('Payment: About to initialize payment vim, module available:', !!paymentVimModule);
    if (paymentVimModule) {
      try {
        logger.debug('Payment: Calling initializePaymentVim');
        paymentVimModule.initializePaymentVim();
        logger.debug('Payment: initializePaymentVim called successfully');
        // Refresh cursor position after a bit more delay to account for CSS animations
        setTimeout(() => {
          logger.debug('Payment: About to refresh cursor');
          paymentVimModule.refreshPaymentCursor();
        }, 200);
      } catch (error) {
        logger.error('Payment: Error initializing payment vim:', error);
      }
    } else {
      logger.warn('Payment: paymentVimModule not loaded yet, trying dynamic import');
      import('./paymentVimNavigation.js').then(module => {
        logger.debug('Payment: Module imported successfully, calling initializePaymentVim');
        try {
          module.initializePaymentVim();
          logger.debug('Payment: initializePaymentVim called successfully');
          setTimeout(() => {
            module.refreshPaymentCursor();
          }, 200);
        } catch (error) {
          logger.error('Payment: Error initializing payment vim:', error);
        }
      }).catch((error) => {
        logger.error('Payment: Failed to import payment vim navigation:', error);
      });
    }
  }, 300); // Longer delay for Stripe Elements to load
}

export function hidePaymentModal() {
  logger.debug("Payment: hidePaymentModal called");
  
  const wasClosedViaCancel = window.paymentModalClosingViaCancel;
  window.paymentModalClosingViaCancel = false; // Reset flag immediately
  
  // Disable payment vim navigation first
  if (paymentVimModule) {
    logger.debug("Payment: Calling disablePaymentVim on preloaded module");
    paymentVimModule.disablePaymentVim();
  } else {
    logger.debug("Payment: paymentVimModule not available, trying dynamic import for disable");
    import('./paymentVimNavigation.js').then(module => {
      logger.debug("Payment: Calling disablePaymentVim");
      module.disablePaymentVim();
    }).catch(() => {
      // Ignore if payment vim navigation is not available
    });
  }
  
  paymentModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  
  // Only do extensive cleanup if closed via cancel
  if (wasClosedViaCancel) {
    setTimeout(() => {
      // Clear all text selections
      if (window.getSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.empty && selection.empty();
      }
      
      // Force focus back to body
      document.body.focus();
      
      logger.debug("Payment: Cleared selections and focus for cancel close");
    }, 50);
  }
  
  // Re-enable main vim navigation when payment modal is closed
  setTimeout(() => {
    logger.debug("Payment: Re-enabling main vim navigation after modal close");
    
    import('./vimNavigation.js').then(module => {
      if (wasClosedViaCancel) {
        logger.debug("Payment: Was closed via cancel - doing full reset");
        // Full reset only if closed via cancel button
        module.disableVimNavigation();
        module.hideCursor();
        
        // Force remove any lingering cursors
        document.querySelectorAll('.vim-cursor, .payment-vim-cursor').forEach(cursor => cursor.remove());
        
        // Clear any vim text modifications
        document.querySelectorAll('[data-original-text], [data-original-payment-text]').forEach(el => {
          const originalText = el.getAttribute('data-original-text') || el.getAttribute('data-original-payment-text');
          if (originalText) {
            el.textContent = originalText;
            el.removeAttribute('data-original-text');
            el.removeAttribute('data-original-payment-text');
          }
        });
        
        // Then re-enable with a fresh state
        setTimeout(() => {
          module.enableVimNavigation();
          module.showCursor();
          logger.debug("Payment: Main vim navigation fully reset and re-enabled");
        }, 50);
      } else {
        logger.debug("Payment: Normal close - simple re-enable");
        // Normal re-enable for other close methods
        module.enableVimNavigation();
        module.showCursor();
      }
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  }, 100); // Small delay to ensure payment vim is fully disabled first
  
  // Reset form state
  resetPaymentForm();
}

function initializeStripeElements() {
  elements = stripe.elements();
  
  const card = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  });
  
  card.mount('#card-element');
  
  // Handle real-time validation errors from the card Element
  card.on('change', ({error}) => {
    const displayError = document.getElementById('card-errors');
    if (error) {
      displayError.textContent = error.message;
    } else {
      displayError.textContent = '';
    }
  });
}

function updateAmountDisplay() {
  const amountInput = document.getElementById('payment-amount');
  const amountDisplay = document.getElementById('amount-display');
  const levelNumber = document.getElementById('level-number');
  const characterLevel = document.getElementById('character-level');
  
  const amount = parseInt(amountInput.value) || 1;
  const level = Math.max(1, amount);
  
  amountDisplay.textContent = amount;
  levelNumber.textContent = level;
  characterLevel.textContent = `Level ${level}`;
}

function updateMessageCounter() {
  const supportMessage = document.getElementById('support-message');
  const messageCount = document.getElementById('message-count');
  
  const length = supportMessage.value.length;
  messageCount.textContent = length;
  
  // Change color based on length
  if (length > 120) {
    messageCount.style.color = '#e74c3c';
  } else if (length > 100) {
    messageCount.style.color = '#f39c12';
  } else {
    messageCount.style.color = '#27ae60';
  }
}

async function handlePaymentSubmit(event) {
  event.preventDefault();
  
  // Double-check authentication before processing payment
  if (!isLoggedIn()) {
    logger.error('User must be logged in to process payment');
    alert('Please log in first to purchase characters.');
    return;
  }

  // Verify authentication with server before proceeding
  const isAuthenticated = await verifyAuthenticationStatus();
  if (!isAuthenticated) {
    logger.error('Authentication check failed - user not authenticated on server');
    alert('Your session has expired. Please refresh the page and log in again.');
    return;
  }
  
  logger.debug('Authentication verified, proceeding with payment');
  
  const submitButton = document.getElementById('submit-payment');
  const spinner = document.getElementById('payment-spinner');
  const buttonText = document.getElementById('button-text');
  
  // Disable button and show spinner
  submitButton.disabled = true;
  spinner.classList.remove('hidden');
  buttonText.style.opacity = '0.6';
  
  try {
    const amount = parseInt(document.getElementById('payment-amount').value) || 1;
    const supportMessage = document.getElementById('support-message').value.trim();
    
    // Create payment intent
    const { clientSecret, paymentId } = await createPaymentIntent(amount, supportMessage);
    
    // Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement('card'),
      }
    });
    
    if (error) {
      // Show error to customer
      document.getElementById('card-errors').textContent = error.message;
    } else {
      // Payment succeeded
      await confirmPayment(paymentId);
      hidePaymentModal();
      showPaymentSuccessBanner();
      
      // Refresh character selection to show unlocked character
      await refreshCharacterSelection();
    }
  } catch (error) {
    logger.error('Payment error:', error);
    document.getElementById('card-errors').textContent = 'Payment failed. Please try again.';
  } finally {
    // Re-enable button and hide spinner
    submitButton.disabled = false;
    spinner.classList.add('hidden');
    buttonText.style.opacity = '1';
  }
}

async function createPaymentIntent(amount, supportMessage = '') {
  const response = await fetch('/api/payment/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      amount: amount * 100, // Convert to cents
      character_name: 'boba_diamond',
      currency: 'eur',
      support_message: supportMessage
    }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logger.error('Payment endpoint returned 401 - session not valid');
      throw new Error('Your session has expired. Please refresh the page and log in again.');
    }
    try {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    } catch (parseError) {
      throw new Error(`Payment failed with status ${response.status}: ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  return {
    clientSecret: data.client_secret,
    paymentId: data.payment_id
  };
}

async function confirmPayment(paymentId) {
  const response = await fetch(`/api/payment/confirm/${paymentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm payment');
  }
  
  return await response.json();
}

async function refreshCharacterSelection() {
  // Use the exported function from characterSelection.js
  await loadPlayerCharacters();
}


function showPaymentSuccessBanner() {
  // Create simple green success banner at top of page
  const successBanner = document.createElement('div');
  successBanner.className = 'payment-success-banner';
  successBanner.innerHTML = `
    <div class="success-banner-content">
      ✅ Payment successful! Thank you for your support!
    </div>
  `;
  
  // Insert at the very top of the body
  document.body.insertBefore(successBanner, document.body.firstChild);
  
  // Remove banner after 8 seconds
  setTimeout(() => {
    if (successBanner.parentNode) {
      successBanner.parentNode.removeChild(successBanner);
    }
  }, 8000);
}

function resetPaymentForm() {
  // Reset amount input
  document.getElementById('payment-amount').value = '5';
  updateAmountDisplay();
  
  // Clear any error messages
  document.getElementById('card-errors').textContent = '';
  
  // Re-enable submit button
  const submitButton = document.getElementById('submit-payment');
  submitButton.disabled = false;
  
  // Hide spinner
  const spinner = document.getElementById('payment-spinner');
  spinner.classList.add('hidden');
  
  // Reset button text opacity
  const buttonText = document.getElementById('button-text');
  buttonText.style.opacity = '1';
}