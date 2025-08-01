let isNewsletterOpen = false;
let isNewsGameAreaOpen = false;

export function toggleNewsletterPanel() {
  const panel = document.getElementById('newsletterPanel');
  const button = document.getElementById('newsletterButton');
  
  if (!panel || !button) return;
  
  if (isNewsletterOpen) {
    hideNewsletterPanel();
  } else {
    showNewsletterPanel();
  }
}

export function showNewsletterPanel() {
  const panel = document.getElementById('newsletterPanel');
  const button = document.getElementById('newsletterButton');
  
  if (!panel || !button) return;
  
  // Show panel with animation
  panel.classList.remove('hidden');
  panel.classList.add('visible');
  
  // Update button state
  button.classList.add('active');
  
  // Hide vim cursor when newsletter panel is open
  if (window.hideCursor) {
    window.hideCursor();
  }
  
  isNewsletterOpen = true;
}

export function hideNewsletterPanel() {
  const panel = document.getElementById('newsletterPanel');
  const button = document.getElementById('newsletterButton');
  
  if (!panel || !button) return;
  
  // Hide panel with animation
  panel.classList.remove('visible');
  panel.classList.add('hidden');
  
  // Update button state
  button.classList.remove('active');
  
  // Show vim cursor when newsletter panel is closed
  if (window.showCursor) {
    window.showCursor();
  }
  
  isNewsletterOpen = false;
}

export function showNewsGameArea() {
  const gameArea = document.getElementById('newsGameArea');
  
  if (!gameArea) return;
  
  // Show 2D game diffusion area
  gameArea.classList.remove('hidden');
  
  // Close newsletter panel
  hideNewsletterPanel();
  
  isNewsGameAreaOpen = true;
}

export function hideNewsGameArea() {
  const gameArea = document.getElementById('newsGameArea');
  
  if (!gameArea) return;
  
  // Hide 2D game diffusion area
  gameArea.classList.add('hidden');
  
  isNewsGameAreaOpen = false;
}

export function setupNewsletterEventListeners() {
  // Note: Read more button handlers are now set up dynamically in newsletterData.js
  // when newsletters are rendered from the API
  
  // Close news game area button
  const closeNewsBtn = document.getElementById('closeNewsBtn');
  if (closeNewsBtn) {
    closeNewsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      logger.debug('Close news button clicked - closing 2D game area');
      hideNewsGameArea();
    });
  }
  
  // Close newsletter panel when clicking outside
  document.addEventListener('click', (e) => {
    const newsletterSystem = document.querySelector('.survey-system');
    const newsGameArea = document.getElementById('newsGameArea');
    
    if (isNewsletterOpen && newsletterSystem && !newsletterSystem.contains(e.target)) {
      hideNewsletterPanel();
    }
    
    if (isNewsGameAreaOpen && newsGameArea && !newsGameArea.contains(e.target)) {
      hideNewsGameArea();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isNewsGameAreaOpen) {
        hideNewsGameArea();
      } else if (isNewsletterOpen) {
        hideNewsletterPanel();
      }
    }
  });
}