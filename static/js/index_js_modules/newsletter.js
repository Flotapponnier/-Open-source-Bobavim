// Newsletter module for displaying news with 2D game diffusion area
import { toggleNewsletterPanel, showNewsletterPanel, hideNewsletterPanel, setupNewsletterEventListeners } from './newsletter_js_modules/newsletterModal.js';
import { loadNewsletters, renderNewsletterList } from './newsletter_js_modules/newsletterData.js';

export async function initializeNewsletter() {
  const newsletterButton = document.getElementById('newsletterButton');
  
  if (!newsletterButton) {
    logger.debug('Newsletter button not found');
    return;
  }
  
  logger.debug('Initializing newsletter system...');
  
  // Load newsletters from API
  await loadAndDisplayNewsletters();
  
  // Setup button click handler for toggle functionality
  newsletterButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    logger.debug('Newsletter button clicked - toggling panel');
    toggleNewsletterPanel();
  });
  
  // Setup newsletter event listeners
  setupNewsletterEventListeners();
  
  logger.debug('Newsletter system initialized successfully');
}

async function loadAndDisplayNewsletters() {
  try {
    logger.debug('Loading newsletters from API...');
    const newsletters = await loadNewsletters();
    logger.debug('Loaded newsletters:', newsletters);
    renderNewsletterList(newsletters);
  } catch (error) {
    logger.error('Error loading newsletters:', error);
    // Fallback to show a default message
    renderNewsletterList([]);
  }
}

export { toggleNewsletterPanel, showNewsletterPanel, hideNewsletterPanel };