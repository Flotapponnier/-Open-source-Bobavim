// =============================================
// INTELLIGENT RESPONSIVE SCALING SYSTEM
// Clean, proportional, overflow-proof solution
// =============================================

export class IntelligentScaling {
  constructor() {
    this.isScaling = false;
    this.resizeTimeout = null;
    this.lastDimensions = { width: 0, height: 0, rows: 0, cols: 0 };
  }

  // Main scaling function - calculates everything proportionally
  applyIntelligentScaling() {
    if (this.isScaling) return;
    this.isScaling = true;

    try {
      const result = this.calculateOptimalLayout();
      if (result) {
        this.applyLayout(result);
      }
    } catch (error) {
      logger.error('Intelligent scaling error:', error);
    } finally {
      this.isScaling = false;
    }
  }

  // Calculate the optimal layout for any map size
  calculateOptimalLayout() {
    const gameBoard = document.querySelector('.game-board');
    const keyboardMap = document.querySelector('.keyboard-map');
    
    if (!gameBoard || !keyboardMap) return null;

    // Get available space
    const boardRect = gameBoard.getBoundingClientRect();
    const isFullscreen = document.body.classList.contains('fullscreen-mode');
    
    // Calculate usable area - be more aggressive with space usage for large maps
    const mapDimensions = this.getMapDimensions(keyboardMap);
    if (!mapDimensions) return null;
    
    const { rows, cols } = mapDimensions;
    const complexity = rows * cols;
    
    // Adjust margins based on map size - use more space for large maps
    let boardPadding, lineNumberSpace, spriteOverflowBuffer, rightMargin;
    
    if (complexity > 500) {
      // Large maps: use more space, smaller margins
      boardPadding = isFullscreen ? 30 : 20;
      lineNumberSpace = 60;
      spriteOverflowBuffer = 30;
      rightMargin = 40; // Increased right margin to prevent overflow
    } else if (complexity > 200) {
      // Medium maps: prevent overflow with bigger right margin
      boardPadding = isFullscreen ? 40 : 30;
      lineNumberSpace = 70;
      spriteOverflowBuffer = 35;
      rightMargin = 60; // Much bigger right margin to prevent overflow
    } else {
      // Small maps: conservative margins
      boardPadding = isFullscreen ? 50 : 40;
      lineNumberSpace = 80;
      spriteOverflowBuffer = 40;
      rightMargin = 30;
    }
    
    const usableWidth = boardRect.width - (boardPadding * 2) - lineNumberSpace - spriteOverflowBuffer - rightMargin;
    const usableHeight = boardRect.height - (boardPadding * 2) - spriteOverflowBuffer;
    
    logger.debug(`🔍 LAYOUT DEBUG: boardRect=${boardRect.width}x${boardRect.height}, usableArea=${usableWidth}x${usableHeight}`);

    const hasEmptyRows = mapDimensions.hasEmptyRows;

    // Calculate optimal key size to fit in available space
    const gapSize = this.calculateOptimalGapSize(rows, cols);
    
    // Calculate what key size would fit perfectly
    const maxKeyWidth = (usableWidth - (gapSize * (cols - 1))) / cols;
    const maxKeyHeight = (usableHeight - (gapSize * (rows - 1))) / rows;
    
    // Use the most constraining dimension (keep keys square)
    let keySize = Math.floor(Math.min(maxKeyWidth, maxKeyHeight));
    
    // Apply reasonable min/max limits based on map complexity
    const minKeySize = 8;
    let maxKeySize;
    
    if (complexity < 100) {
      // Small maps: allow bigger keyboards when there's space
      maxKeySize = isFullscreen ? 100 : 80;
    } else if (complexity < 200) {
      // Small/medium maps: can be much bigger
      maxKeySize = isFullscreen ? 140 : 110;
    } else if (complexity < 500) {
      // Large maps (hard): allow very big keyboards
      maxKeySize = isFullscreen ? 180 : 140;
    } else {
      // Massive maps: still allow decent size
      maxKeySize = isFullscreen ? 140 : 100;
    }
    
    keySize = Math.max(minKeySize, Math.min(maxKeySize, keySize));
    
    // Calculate total map dimensions with this key size
    let totalMapWidth = (keySize * cols) + (gapSize * (cols - 1));
    const totalMapHeight = (keySize * rows) + (gapSize * (rows - 1));
    
    // CRITICAL: Ensure keyboard never overflows parent container
    // Force key size to fit within available space, no matter what
    if (totalMapWidth > usableWidth) {
      logger.debug(`🚨 KEYBOARD OVERFLOW PREVENTION: ${totalMapWidth}px > ${usableWidth}px - Reducing key size`);
      keySize = Math.floor((usableWidth - (gapSize * (cols - 1))) / cols);
      keySize = Math.max(minKeySize, keySize);
      totalMapWidth = (keySize * cols) + (gapSize * (cols - 1));
      logger.debug(`🔧 FIXED KEY SIZE: ${keySize}px → total width: ${totalMapWidth}px`);
    }
    
    logger.debug(`🔍 KEY SIZE: ${complexity} cells (${rows}x${cols}) → ${keySize}px (total: ${totalMapWidth}px / ${usableWidth}px available)`);

    // Position calculation - ensure keyboard stays within bounds
    const targetFirstLetterX = Math.min(boardRect.width * 0.25, lineNumberSpace + 50); // 1/4 from left edge, but not too far
    const mapStartX = lineNumberSpace + 20; // Fixed position with buffer after line numbers

    return {
      keySize,
      gapSize,
      totalMapWidth,
      totalMapHeight,
      mapStartX,
      targetFirstLetterX,
      rows,
      cols,
      complexity,
      hasEmptyRows,
      isFullscreen,
      boardWidth: boardRect.width,
      usableWidth,
      fontSize: this.calculateOptimalFontSize(keySize),
      spriteScale: this.calculateOptimalSpriteScale(keySize, rows, cols)
    };
  }

  // Get map dimensions by analyzing the keyboard structure
  getMapDimensions(keyboardMap) {
    const rows = keyboardMap.querySelectorAll('.keyboard-row');
    if (rows.length === 0) return null;

    let maxCols = 0;
    let hasEmptyRows = false;

    rows.forEach(row => {
      const keys = row.querySelectorAll('.key');
      const keysInRow = keys.length;
      maxCols = Math.max(maxCols, keysInRow);

      // Check if this is an empty row (paragraph separator)
      if (keysInRow === 0 || Array.from(keys).every(key => {
        const letter = key.getAttribute('data-letter');
        return !letter || letter.trim() === '';
      })) {
        hasEmptyRows = true;
      }
    });

    return {
      rows: rows.length,
      cols: maxCols,
      hasEmptyRows
    };
  }

  // Calculate optimal gap size based on map complexity
  calculateOptimalGapSize(rows, cols) {
    const complexity = rows * cols;
    
    if (complexity > 1000) return 1;  // Massive maps need tiny gaps
    if (complexity > 500) return 2;   // Large maps need small gaps  
    if (complexity > 200) return 3;   // Medium maps
    return 4;                         // Small maps can have bigger gaps
  }

  // Calculate optimal font size proportional to key size
  calculateOptimalFontSize(keySize) {
    // Font should be 40-60% of key size for good readability
    const baseFontSize = keySize * 0.5;
    return Math.max(8, Math.min(32, baseFontSize));
  }

  // Calculate optimal sprite scale for characters and pearls
  calculateOptimalSpriteScale(keySize, rows, cols) {
    // Base scale purely on key size for consistent proportions
    const complexity = rows * cols;
    
    // Make characters proportional to keyboard size with much bigger base scales for small maps
    let baseScale;
    if (complexity < 50) {
      // Very tiny maps (like Easy Easy): moderate base for visibility
      baseScale = keySize / 80; // Increased from 120 to 80 for better visibility
    } else if (complexity < 250) {
      // Small maps (map 1, 2): smaller base for normal size
      baseScale = keySize / 50; // Reduced from 30 to 50 for normal size
    } else if (complexity < 500) {
      // Medium maps: bigger proportional base
      baseScale = keySize / 25; // Keep same as before
    } else {
      // Large/big maps: much bigger proportional base for enemies, molds, characters, pearls
      baseScale = keySize / 18; // Increased from 22/20 to 18 for bigger game elements
    }
    
    // Apply complexity-based adjustments (screen-size independent)
    if (complexity > 1000) {
      // Massive maps: bigger character increase
      baseScale *= 1.4;
    } else if (complexity > 500) {
      // Large maps: bigger character increase
      baseScale *= 1.3;
    } else if (complexity > 200) {
      // Medium maps: bigger size
      baseScale *= 1.2;
    } else if (complexity > 100) {
      // Small-medium maps: normal size
      baseScale *= 1.1;
    } else if (complexity < 50) {
      // Very tiny maps (like Easy Easy): reduce to prevent giants
      const previousScale = baseScale;
      baseScale *= 0.6; // Reduce for tiny maps to prevent giants
      logger.debug(`🔍 TINY MAP SCALE: ${complexity} cells, baseScale ${previousScale.toFixed(3)} → ${baseScale.toFixed(3)} (multiplier: 0.6)`);
    } else if (complexity < 150) {
      // Small maps (like map 1 & 2): slight reduction
      const previousScale = baseScale;
      baseScale *= 0.8; // Slight reduction for small maps
      logger.debug(`🔍 SMALL MAP SCALE: ${complexity} cells, baseScale ${previousScale.toFixed(3)} → ${baseScale.toFixed(3)} (multiplier: 0.8)`);
    }

    // Ensure reasonable bounds with screen-size aware limits
    const minScale = 0.3;
    let maxScale;
    
    // Get screen width to apply screen-specific limits
    const screenWidth = window.innerWidth;
    
    if (complexity < 250) {
      // Small maps: very controlled limits to prevent giants on big screens
      maxScale = screenWidth > 1800 ? 0.5 : (screenWidth > 1400 ? 0.6 : 1.0);
    } else if (complexity < 500) {
      // Medium maps: controlled limit especially on big screens  
      maxScale = screenWidth > 1800 ? 0.6 : (screenWidth > 1400 ? 0.8 : 1.0);
    } else {
      // Large maps: bigger limits for better visibility of enemies, molds, characters, pearls
      maxScale = screenWidth > 1800 ? 0.8 : (screenWidth > 1400 ? 1.0 : 1.5);
    }
    
    const finalScale = Math.max(minScale, Math.min(maxScale, baseScale));
    
    logger.debug(`🎮 SPRITE SCALE: ${complexity} cells → ${finalScale.toFixed(2)}x (keySize: ${keySize}px, screen: ${screenWidth}px, maxScale: ${maxScale})`);
    return finalScale;
  }

  // Apply the calculated layout
  applyLayout(layout) {
    const {
      keySize,
      gapSize,
      totalMapWidth,
      mapStartX,
      targetFirstLetterX,
      rows,
      cols,
      complexity,
      fontSize,
      spriteScale,
      isFullscreen,
      boardWidth,
      usableWidth
    } = layout;

    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--key-size', `${keySize}px`);
    root.style.setProperty('--key-gap', `${gapSize}px`);
    root.style.setProperty('--key-font-size', `${fontSize}px`);
    root.style.setProperty('--sprite-scale', spriteScale);
    root.style.setProperty('--map-rows', rows);
    root.style.setProperty('--map-cols', cols);
    
    // Position the game board safely without overflow and apply CSS classes
    const gameBoard = document.querySelector('.game-board');
    const keyboardMap = document.querySelector('.keyboard-map');
    
    // Apply appropriate CSS class based on map complexity
    if (gameBoard) {
      // Remove all map size classes first
      gameBoard.classList.remove('small-map', 'medium-map', 'large-map');
      
      if (complexity < 250) {
        gameBoard.classList.add('small-map');
        root.style.setProperty('--sprite-multiplier', '0.8'); // Smaller multiplier for normal size
        logger.debug(`🔍 SMALL MAP CSS: Applied .small-map class for ${complexity} cells (${rows}x${cols})`);
        logger.debug(`🔍 SPRITE SCALE DEBUG: --sprite-scale=${root.style.getPropertyValue('--sprite-scale')}, --sprite-multiplier=0.8`);
      } else if (complexity < 500) {
        gameBoard.classList.add('medium-map');
        root.style.setProperty('--sprite-multiplier', '0.9');
        logger.debug(`🔍 MEDIUM MAP CSS: Applied .medium-map class for ${complexity} cells (${rows}x${cols})`);
        logger.debug(`🔍 SPRITE SCALE DEBUG: --sprite-scale=${root.style.getPropertyValue('--sprite-scale')}, --sprite-multiplier=0.9`);
      } else {
        gameBoard.classList.add('large-map');
        root.style.setProperty('--sprite-multiplier', '1.05');
        logger.debug(`🔍 LARGE MAP CSS: Applied .large-map class for ${complexity} cells (${rows}x${cols})`);
        logger.debug(`🔍 SPRITE SCALE DEBUG: --sprite-scale=${root.style.getPropertyValue('--sprite-scale')}, --sprite-multiplier=1.05`);
      }
    }
    
    if (gameBoard && keyboardMap) {
      // Reset any previous positioning
      gameBoard.style.paddingLeft = '';
      gameBoard.style.paddingRight = '';
      gameBoard.style.justifyContent = '';
      gameBoard.style.alignItems = 'center';
      
      // Intelligent positioning based on map size and available space
      const lineNumberSpace = 80;
      const manualSpace = 200; // Space for vim manual so it doesn't hide the map
      const availableForPositioning = boardWidth - lineNumberSpace - manualSpace - totalMapWidth;
      
      if (complexity < 100) {
        // Small maps (map 1 & 2): center them nicely
        gameBoard.style.justifyContent = 'center';
        gameBoard.style.paddingLeft = `${lineNumberSpace}px`;
        gameBoard.style.paddingRight = '20px';
        logger.debug(`🎯 SMALL MAP CENTERED: ${complexity} cells, centered positioning`);
      } else if (availableForPositioning >= 50) {
        // Medium/large maps with enough space: position more left to prevent overflow
        const targetPosition = boardWidth * 0.25; // Moved to 25% to prevent overflow on big screens
        const safeLeftPosition = Math.max(lineNumberSpace + manualSpace, targetPosition);
        gameBoard.style.paddingLeft = `${safeLeftPosition}px`;
        gameBoard.style.justifyContent = 'flex-start';
        logger.debug(`✅ LARGE MAP POSITIONED: at ${safeLeftPosition}px (25% area, preventing overflow), ${availableForPositioning}px space available`);
      } else {
        // Not enough space: position safely to avoid manual but prevent overflow
        const safePosition = lineNumberSpace + manualSpace + 20;
        const maxAllowedWidth = boardWidth - safePosition - 40; // 40px right margin
        
        if (totalMapWidth <= maxAllowedWidth) {
          gameBoard.style.paddingLeft = `${safePosition}px`;
          gameBoard.style.justifyContent = 'flex-start';
          logger.debug(`✅ SAFE POSITIONING: at ${safePosition}px, avoiding manual and overflow`);
        } else {
          // Last resort: center but ensure no overflow
          gameBoard.style.justifyContent = 'center';
          gameBoard.style.paddingLeft = `${Math.min(lineNumberSpace, 40)}px`;
          gameBoard.style.paddingRight = '40px';
          logger.debug(`⚠️ OVERFLOW PREVENTION: centering with minimal padding`);
        }
      }
      
      // Ensure keyboard map has proper constraints
      keyboardMap.style.maxWidth = `${usableWidth}px`;
      keyboardMap.style.width = 'fit-content';
    }

    // Apply sizing to all keys
    this.updateKeySizes(keySize, gapSize);

    // Update row widths for vim-like alignment
    this.updateRowWidths(cols, keySize, gapSize);

    logger.debug(`🧠 INTELLIGENT SCALING: ${rows}x${cols} → ${keySize}px keys, total width: ${totalMapWidth}px`);
  }

  // Update individual key sizes
  updateKeySizes(keySize, gapSize) {
    const keyboardMap = document.querySelector('.keyboard-map');
    if (!keyboardMap) return;

    // Update keyboard map gap
    keyboardMap.style.gap = `${gapSize}px`;

    // Update all keys
    const keys = keyboardMap.querySelectorAll('.key');
    keys.forEach(key => {
      key.style.width = `${keySize}px`;
      key.style.height = `${keySize}px`;
    });

    // Update all rows
    const rows = keyboardMap.querySelectorAll('.keyboard-row');
    rows.forEach(row => {
      row.style.gap = `${gapSize}px`;
    });
  }

  // Update row widths for consistent vim-like grid alignment
  updateRowWidths(cols, keySize, gapSize) {
    const keyboardMap = document.querySelector('.keyboard-map');
    if (!keyboardMap) return;

    const rowWidth = (cols * keySize) + ((cols - 1) * gapSize);
    
    const rows = keyboardMap.querySelectorAll('.keyboard-row');
    rows.forEach(row => {
      row.style.width = `${rowWidth}px`;
      row.style.minWidth = `${rowWidth}px`;
    });
  }

  // Check if layout needs updating
  needsUpdate() {
    const gameBoard = document.querySelector('.game-board');
    const keyboardMap = document.querySelector('.keyboard-map');
    
    if (!gameBoard || !keyboardMap) return false;

    const boardRect = gameBoard.getBoundingClientRect();
    const mapDimensions = this.getMapDimensions(keyboardMap);
    
    if (!mapDimensions) return false;

    // Check if screen size or map dimensions changed
    const dimensionsChanged = 
      boardRect.width !== this.lastDimensions.width ||
      boardRect.height !== this.lastDimensions.height ||
      mapDimensions.rows !== this.lastDimensions.rows ||
      mapDimensions.cols !== this.lastDimensions.cols;

    if (dimensionsChanged) {
      this.lastDimensions = {
        width: boardRect.width,
        height: boardRect.height,
        rows: mapDimensions.rows,
        cols: mapDimensions.cols
      };
      return true;
    }

    return false;
  }

  // Set up automatic responsive behavior
  initialize() {
    // Initial scaling
    setTimeout(() => {
      this.applyIntelligentScaling();
    }, 100);

    // Window resize handling
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.needsUpdate()) {
          this.applyIntelligentScaling();
        }
      }, 100);
    });

    // Orientation change handling
    window.addEventListener('orientationchange', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.applyIntelligentScaling();
      }, 300);
    });

    // Map change detection via mutation observer
    this.setupMapChangeObserver();

    logger.debug('🧠 Intelligent Responsive System initialized');
  }

  // Watch for map changes and re-scale automatically
  setupMapChangeObserver() {
    const keyboardMap = document.querySelector('.keyboard-map');
    if (!keyboardMap) return;

    const observer = new MutationObserver(() => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.needsUpdate()) {
          this.applyIntelligentScaling();
        }
      }, 50);
    });

    observer.observe(keyboardMap, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-map', 'data-letter']
    });
  }

  // Force immediate scaling (for external triggers like fullscreen toggle)
  forceUpdate() {
    clearTimeout(this.resizeTimeout);
    this.applyIntelligentScaling();
  }
}

// Create and export singleton instance
export const intelligentScaling = new IntelligentScaling();

// Export convenience functions
export function initializeIntelligentScaling() {
  intelligentScaling.initialize();
}

export function forceIntelligentScaling() {
  intelligentScaling.forceUpdate();
}

export function updateAfterMapChange() {
  intelligentScaling.forceUpdate();
}