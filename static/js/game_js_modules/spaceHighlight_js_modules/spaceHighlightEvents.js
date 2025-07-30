import { isSpaceHighlightActive } from './spaceHighlightState.js';
import { showSpaceHighlight } from './spaceHighlightVisibility.js';

// Handle responsive scaling - refresh highlights when screen resizes
export function updateSpaceHighlightOnResize() {
  if (isSpaceHighlightActive()) {
    // Refresh space highlights to ensure they maintain styling after resize
    showSpaceHighlight();
  }
}

// Initialize space highlight module
export function initializeSpaceHighlight() {
  // Add CSS for space highlighting with proper priority
  const style = document.createElement('style');
  style.id = 'space-highlight-style';
  style.textContent = `
    /* Space highlighting for empty spaces */
    .key[data-space-highlighted="true"] .key-top {
      background: var(--space-background) !important;
      border-color: var(--space-border) !important;
      box-shadow: var(--space-shadow) !important;
    }
    
    /* Player on space characters - keep grey background with orange border */
    .key[data-map="1"][data-space-highlighted="true"] .key-top {
      background: linear-gradient(145deg, #868e96, #6c757d) !important;
      border-color: #ff6b35 !important;
      box-shadow: 
        0 6px 0 #e55100,
        0 8px 12px rgba(0, 0, 0, 0.3),
        inset 0 2px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2),
        0 0 20px rgba(255, 107, 53, 0.8) !important;
    }
    
    /* Pearl on space characters - keep grey background with blue border */
    .key[data-map="3"][data-space-highlighted="true"] .key-top {
      background: linear-gradient(145deg, #868e96, #6c757d) !important;
      border-color: #2196f3 !important;
      box-shadow: 
        0 6px 0 #1976d2,
        0 8px 12px rgba(0, 0, 0, 0.3),
        inset 0 2px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2),
        0 0 15px rgba(33, 150, 243, 0.5) !important;
    }
    
    /* Enemy on space characters - keep grey background with red border */
    .key[data-map="2"][data-space-highlighted="true"] .key-top {
      background: linear-gradient(145deg, #868e96, #6c757d) !important;
      border-color: #f44336 !important;
      box-shadow: 
        0 6px 0 #d32f2f,
        0 8px 12px rgba(0, 0, 0, 0.3),
        inset 0 2px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2),
        0 0 20px rgba(244, 67, 54, 0.8) !important;
    }
    
    /* Pearl mold on space characters - keep grey background with green border */
    .key[data-map="4"][data-space-highlighted="true"] .key-top {
      background: linear-gradient(145deg, #868e96, #6c757d) !important;
      border-color: #4caf50 !important;
      box-shadow: 
        0 6px 0 #388e3c,
        0 8px 12px rgba(0, 0, 0, 0.3),
        inset 0 2px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2),
        0 0 15px rgba(76, 175, 80, 0.8) !important;
    }
  `;
  document.head.appendChild(style);
  
  // Listen for window resize to update highlights
  window.addEventListener('resize', updateSpaceHighlightOnResize);
}