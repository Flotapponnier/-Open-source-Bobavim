import {
  isScalingEnabled,
  hasInitialScaleApplied,
  setInitialScaleApplied,
} from "./scalingState.js";
import { RESPONSIVE_CONFIG } from '../constants_js_modules/responsive.js';

let resizeTimeout;
let isCurrentlyScaling = false;

export function applyScaling() {
  if (isCurrentlyScaling) return;
  
  const gameBoard = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.GAME_BOARD);
  const keyboardMap = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.KEYBOARD_MAP);

  if (!gameBoard || !keyboardMap) return;

  isCurrentlyScaling = true;

  // Use multiple animation frames to ensure accurate layout measurements
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        calculateAndApplyProportionalScaling(gameBoard, keyboardMap);
      } catch (error) {
        logger.error('Error in proportional scaling:', error);
      } finally {
        isCurrentlyScaling = false;
      }
    });
  });
}

function calculateAndApplyProportionalScaling(gameBoard, keyboardMap) {
  // Get container dimensions
  const boardRect = gameBoard.getBoundingClientRect();
  const isFullscreen = document.body.classList.contains('fullscreen-mode');
  
  // Get map dimensions by counting rows and columns first
  const keyboardRows = keyboardMap.querySelectorAll('.keyboard-row');
  if (keyboardRows.length === 0) return;
  
  // Calculate actual map dimensions more precisely
  const mapRows = keyboardRows.length;
  let maxCols = 0;
  
  // Find the maximum number of columns across all rows
  keyboardRows.forEach(row => {
    const keysInRow = row.querySelectorAll('.key').length;
    maxCols = Math.max(maxCols, keysInRow);
  });
  
  // 🔧 SPECIAL HANDLING FOR BRACKET STORY MAP - PREVENT SCALING INTERFERENCE
  if (maxCols === 54 && keyboardRows.length === 18) {
    logger.debug(`🎯 BRACKET STORY MAP DETECTED! Using optimal fixed sizing`);
    // Calculate better size that fits but is bigger
    const availableWidth = boardRect.width * 0.70; // Use 70% of available width
    const optimalKeySize = Math.floor(availableWidth / 54) - 1; // Calculate size for 54 letters
    const finalKeySize = Math.max(16, Math.min(22, optimalKeySize)); // Between 16-22px
    
    const root = document.documentElement;
    root.style.setProperty('--key-size', `${finalKeySize}px`);
    root.style.setProperty('--key-gap', '1px');
    root.style.setProperty('--key-font-size', `${finalKeySize * 0.6}px`);
    root.style.setProperty('--sprite-scale', '0.7');
    
    // Force 25% left positioning for bracket story map
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
      gameBoard.style.paddingLeft = '25%';
      gameBoard.style.paddingRight = '2%';
      gameBoard.style.justifyContent = 'flex-start';
      logger.debug(`🎯 BRACKET STORY positioning: 25% from left, keySize: ${finalKeySize}px`);
    }
    
    return; // Exit early to prevent responsive scaling interference
  }
  
  // 🔧 SPECIAL HANDLING FOR PARAGRAPH MAPS - PREVENT OVERFLOW
  // Check for maps with empty rows (paragraph separators) that tend to be wide
  const emptyRowCount = Array.from(keyboardRows).filter(row => {
    const keys = row.querySelectorAll('.key');
    if (keys.length === 0) return true;
    // Check if all keys are spaces
    return Array.from(keys).every(key => {
      const letter = key.getAttribute('data-letter');
      return !letter || letter.trim() === '';
    });
  }).length;
  
  // If we have empty rows and the map is wide, treat it as a paragraph map
  if (emptyRowCount > 0 && maxCols > 35) {
    logger.debug(`🎯 PARAGRAPH MAP DETECTED! ${emptyRowCount} empty rows, ${maxCols} max cols`);
    const availableWidth = boardRect.width * 0.75; // Use 75% of available width
    const optimalKeySize = Math.floor(availableWidth / maxCols) - 1;
    const finalKeySize = Math.max(14, Math.min(20, optimalKeySize)); // Smaller range for paragraph maps
    
    const root = document.documentElement;
    root.style.setProperty('--key-size', `${finalKeySize}px`);
    root.style.setProperty('--key-gap', '1px');
    root.style.setProperty('--key-font-size', `${finalKeySize * 0.6}px`);
    root.style.setProperty('--sprite-scale', '0.6');
    
    // Position paragraph maps more to the left to prevent overflow
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
      gameBoard.style.paddingLeft = '10%'; // Even more left to prevent overflow
      gameBoard.style.paddingRight = '2%';
      gameBoard.style.justifyContent = 'flex-start';
      logger.debug(`🎯 PARAGRAPH MAP positioning: 10% from left, keySize: ${finalKeySize}px`);
    }
    
    return; // Exit early to prevent responsive scaling interference
  }
  
  // Calculate available space using configurable margins with special handling for tiny maps
  const config = RESPONSIVE_CONFIG.ADAPTIVE_SCALING;
  let topBottomMargin = isFullscreen ? config.MARGINS.FULLSCREEN_TOP_BOTTOM : config.MARGINS.NORMAL_TOP_BOTTOM;
  let sideMargin = isFullscreen ? config.MARGINS.FULLSCREEN_SIDES : config.MARGINS.NORMAL_SIDES;
  
  // Use original margins for all maps
  
  const availableWidth = boardRect.width - (sideMargin * 2);
  const availableHeight = boardRect.height - (topBottomMargin * 2);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return;
  }

  const mapCols = maxCols;
  
  // Adaptive gap size using configurable values
  const mapComplexity = mapRows * mapCols;
  let gapSize;
  
  if (mapComplexity >= 1000) {
    gapSize = config.GAPS.MASSIVE_MAPS;
  } else if (mapComplexity >= 500) {
    gapSize = config.GAPS.LARGE_MAPS;
  } else if (mapComplexity >= 200) {
    gapSize = config.GAPS.MEDIUM_MAPS;
  } else {
    gapSize = config.GAPS.SMALL_MAPS;
  }
  
  // Calculate available space for keys after accounting for gaps
  const availableWidthForKeys = availableWidth - (gapSize * (mapCols - 1));
  const availableHeightForKeys = availableHeight - (gapSize * (mapRows - 1));
  
  const keyWidth = Math.floor(availableWidthForKeys / mapCols);
  const keyHeight = Math.floor(availableHeightForKeys / mapRows);
  
  // CRITICAL: Use square keys but prioritize the most constraining dimension
  let keySize = Math.min(keyWidth, keyHeight);
  
  // Check aspect ratio and prioritize the most constraining dimension
  const aspectRatio = mapCols / mapRows;
  if (mapCols >= 50) {
    // Extremely wide maps (50+ letters like bracket stories) - force very tiny keys
    logger.debug(`🚨 EXTREMELY WIDE MAP: ${mapCols} letters detected, forcing very tiny keys`);
    keySize = Math.min(keySize, keyWidth * 0.40); // Force very tiny for 50+ letter maps
  } else if (mapCols >= 45) {
    // Very wide maps (45+ letters) - force small keys
    logger.debug(`🚨 VERY WIDE MAP: ${mapCols} letters detected, forcing small keys`);
    keySize = Math.min(keySize, keyWidth * 0.50); // Force small for 45+ letter maps
  } else if (aspectRatio > 3 || mapCols > 30) {
    // Very wide map (like bracket stories) - force to fit width with extreme safety
    logger.debug(`🔧 VERY WIDE MAP: ${mapCols} letters (ratio: ${aspectRatio.toFixed(2)}), forcing width fit`);
    keySize = Math.min(keySize, keyWidth * 0.60); // Extremely conservative for wide maps
  } else if (mapCols > 25) {
    // Wide maps - need aggressive width constraint
    logger.debug(`🔧 WIDE MAP: ${mapCols} letters, using aggressive width constraint`);
    keySize = Math.min(keySize, keyWidth * 0.65); // Very conservative
  } else if (aspectRatio < 0.5) {
    // Very tall map - prioritize height fit with extra safety
    logger.debug(`🔧 TALL MAP: ratio: ${aspectRatio.toFixed(2)}, prioritizing height`);
    keySize = Math.min(keySize, keyHeight * 0.80); // Much more conservative
  } else if (mapCols > 20) {
    // Moderately wide maps - also need width priority
    logger.debug(`🔧 MEDIUM WIDE MAP: ${mapCols} letters, prioritizing width`);
    keySize = Math.min(keySize, keyWidth * 0.75); // Conservative for wide maps
  } else {
    // Normal aspect ratio - be conservative with both dimensions
    keySize = Math.min(keySize, keyWidth * 0.90, keyHeight * 0.90);
  }
  
  // Adaptive size limits using configurable values
  let minKeySize, maxKeySize;
  const keySizes = isFullscreen ? config.KEY_SIZES.FULLSCREEN : config.KEY_SIZES.NORMAL;
  
  if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.MASSIVE) {
    minKeySize = keySizes.MASSIVE_MAPS_MIN;
    maxKeySize = keySizes.MASSIVE_MAPS_MAX;
  } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.LARGE) {
    minKeySize = keySizes.LARGE_MAPS_MIN;
    maxKeySize = keySizes.LARGE_MAPS_MAX;
  } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.MEDIUM) {
    minKeySize = keySizes.MEDIUM_MAPS_MIN;
    maxKeySize = keySizes.MEDIUM_MAPS_MAX;
  } else {
    minKeySize = keySizes.SMALL_MAPS_MIN;
    maxKeySize = keySizes.SMALL_MAPS_MAX;
  }
  
  // Apply configurable safety factor
  let safetyFactor;
  if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.MASSIVE) {
    safetyFactor = config.SAFETY_FACTORS.MASSIVE_MAPS;
  } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.LARGE) {
    safetyFactor = config.SAFETY_FACTORS.LARGE_MAPS;
  } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.MEDIUM) {
    safetyFactor = config.SAFETY_FACTORS.MEDIUM_MAPS;
  } else {
    safetyFactor = config.SAFETY_FACTORS.SMALL_MAPS;
  }
  
  let finalKeySize = Math.max(minKeySize, Math.min(maxKeySize, keySize * safetyFactor));
  
  // 🔧 SPECIAL KEY SIZE REDUCTION ONLY FOR HJKL MAP
  // Prevent the scaling system from making keys too large for this specific map
  logger.debug(`🔍 DEBUG: mapComplexity=${mapComplexity}, mapRows=${mapRows}, mapCols=${mapCols}`);
  if (mapComplexity === 45 && mapRows === 5 && mapCols === 9) {
    logger.debug(`🎯 HJKL MAP DETECTED! Original finalKeySize: ${finalKeySize}`);
    // Force a much smaller key size to prevent character scaling issues
    finalKeySize = Math.min(finalKeySize, 60); // Cap at 60px to prevent oversized characters
    logger.debug(`🎯 HJKL MAP: New finalKeySize: ${finalKeySize}`);
  }
  
  // CRITICAL: Enhanced validation with width priority for long lines
  let totalMapWidth = (finalKeySize * mapCols) + (gapSize * (mapCols - 1));
  let totalMapHeight = (finalKeySize * mapRows) + (gapSize * (mapRows - 1));
  
  // First pass: Check if map fits with priority on width for wide maps
  if (totalMapWidth > availableWidth || totalMapHeight > availableHeight) {
    logger.warn(`Map overflow detected: ${totalMapWidth}x${totalMapHeight} > ${availableWidth}x${availableHeight}`);
    
    // Calculate required scale to fit - prioritize the most constraining dimension
    const overflowScaleX = availableWidth / totalMapWidth;
    const overflowScaleY = availableHeight / totalMapHeight;
    
    // For very wide maps, be extra conservative with width
    const aspectRatio = mapCols / mapRows;
    let overflowScale;
    if (aspectRatio > 3) {
      // Very wide map - prioritize width fit with extra safety
      overflowScale = overflowScaleX * 0.85;
    } else {
      // Normal map - use both constraints
      overflowScale = Math.min(overflowScaleX, overflowScaleY) * 0.90;
    }
    
    finalKeySize = Math.max(minKeySize, finalKeySize * overflowScale);
    
    // Recalculate with new key size
    totalMapWidth = (finalKeySize * mapCols) + (gapSize * (mapCols - 1));
    totalMapHeight = (finalKeySize * mapRows) + (gapSize * (mapRows - 1));
  }
  
  // Second pass: If still doesn't fit, reduce gaps more aggressively for wide maps
  if (totalMapWidth > availableWidth || totalMapHeight > availableHeight) {
    logger.warn(`Map still overflows, reducing gaps`);
    const aspectRatio = mapCols / mapRows;
    
    if (aspectRatio > 3 && totalMapWidth > availableWidth) {
      // Very wide map - eliminate gaps if needed
      gapSize = 0;
    } else {
      gapSize = Math.max(0, gapSize - 1);
    }
    
    // Recalculate with smaller gaps
    totalMapWidth = (finalKeySize * mapCols) + (gapSize * (mapCols - 1));
    totalMapHeight = (finalKeySize * mapRows) + (gapSize * (mapRows - 1));
  }
  
  // Third pass: Final emergency scaling with enhanced width protection
  if (totalMapWidth > availableWidth || totalMapHeight > availableHeight) {
    logger.warn(`Emergency scaling required`);
    
    const emergencyScaleX = availableWidth / totalMapWidth;
    const emergencyScaleY = availableHeight / totalMapHeight;
    
    // Use the most constraining dimension with extra safety
    const emergencyScale = Math.min(emergencyScaleX, emergencyScaleY) * 0.85;
    
    finalKeySize = Math.max(minKeySize * 0.7, finalKeySize * emergencyScale);
    
    // Final recalculation
    totalMapWidth = (finalKeySize * mapCols) + (gapSize * (mapCols - 1));
    totalMapHeight = (finalKeySize * mapRows) + (gapSize * (mapRows - 1));
    
    logger.debug(`Final emergency size: ${finalKeySize}px, total: ${totalMapWidth}x${totalMapHeight}`);
  }
  
  // CRITICAL EMERGENCY SCALING - Force fit at all costs
  if (totalMapWidth > availableWidth || totalMapHeight > availableHeight) {
    logger.error(`CRITICAL OVERFLOW: Forcing aggressive key size reduction`);
    logger.error(`Map: ${totalMapWidth}x${totalMapHeight}, Available: ${availableWidth}x${availableHeight}`);
    
    // For very wide maps (like bracket stories), be extra aggressive with width
    let widthSafety = 0.85;
    let heightSafety = 0.85;
    
    if (mapCols > 25 || aspectRatio > 3) {
      widthSafety = 0.70; // Much more aggressive for wide maps
      logger.error(`Very wide map detected, using aggressive width safety factor: ${widthSafety}`);
    }
    
    // Calculate what key size would fit based on both width and height
    const widthBasedKeySize = Math.floor((availableWidth - (gapSize * (mapCols - 1))) / mapCols * widthSafety);
    const heightBasedKeySize = Math.floor((availableHeight - (gapSize * (mapRows - 1))) / mapRows * heightSafety);
    
    // Use the most constraining dimension
    finalKeySize = Math.min(widthBasedKeySize, heightBasedKeySize);
    finalKeySize = Math.max(minKeySize * 0.15, finalKeySize); // Allow even smaller keys if needed
    
    logger.error(`Emergency scaling: width-based=${widthBasedKeySize}, height-based=${heightBasedKeySize}, final=${finalKeySize}`);
  }
  
  // Final calculation for logging
  totalMapWidth = (finalKeySize * mapCols) + (gapSize * (mapCols - 1));
  totalMapHeight = (finalKeySize * mapRows) + (gapSize * (mapRows - 1));
  
  // Enhanced debug logging
  logger.debug(`🔍 SCALING DEBUG: ${mapRows}x${mapCols} map (${mapComplexity} cells)`);
  logger.debug(`🔍 ASPECT RATIO: ${(mapCols/mapRows).toFixed(2)} | MAX LETTERS IN ROW: ${mapCols}`);
  logger.debug(`🔍 AVAILABLE SPACE: ${availableWidth.toFixed(1)}x${availableHeight.toFixed(1)}`);
  logger.debug(`🔍 KEY SIZE: ${finalKeySize.toFixed(1)}px | GAP: ${gapSize}px`);
  logger.debug(`Final map size: ${totalMapWidth.toFixed(1)}x${totalMapHeight.toFixed(1)} in ${availableWidth}x${availableHeight} available`);
  
  // Final safety check
  if (totalMapWidth > availableWidth || totalMapHeight > availableHeight) {
    logger.error(`CRITICAL: Map still overflows after all scaling attempts!`);
    logger.error(`Map: ${totalMapWidth}x${totalMapHeight}, Available: ${availableWidth}x${availableHeight}`);
    logger.error(`Aspect ratio: ${(mapCols/mapRows).toFixed(2)}, Key size: ${finalKeySize}, Gap: ${gapSize}`);
  }
  
  // Apply proportional scaling to all elements
  applyProportionalSizing(keyboardMap, finalKeySize, gapSize, isFullscreen, mapRows, mapCols);
  
  // Apply responsive alignment based on map size
  applyResponsiveAlignment(mapComplexity, mapCols, mapRows);
}

function applyProportionalSizing(keyboardMap, keySize, gapSize, isFullscreen, mapRows, mapCols) {
  // Remove any existing transform scaling
  keyboardMap.style.transform = 'none';
  
  // Update CSS custom properties for dynamic sizing
  const root = document.documentElement;
  root.style.setProperty('--key-size', `${keySize}px`);
  root.style.setProperty('--key-gap', `${gapSize}px`);
  
  // Calculate font size proportional to key size with enhanced readability
  const baseFontSize = keySize * 0.35; // Increased from 24% to 35% for bigger, bolder letters
  const mapComplexity = mapRows * mapCols;
  
  let minFontSize, maxFontSize;
  if (isFullscreen) {
    // Enhanced minimum font sizes for better readability in fullscreen
    minFontSize = Math.max(14, 55 / Math.sqrt(mapComplexity));
    maxFontSize = Math.min(42, 160 / Math.sqrt(mapComplexity));
  } else {
    // Enhanced minimum font sizes for better readability in normal mode
    minFontSize = Math.max(12, 45 / Math.sqrt(mapComplexity));
    maxFontSize = Math.min(32, 120 / Math.sqrt(mapComplexity));
  }
  
  const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize));
  root.style.setProperty('--key-font-size', `${fontSize}px`);
  
  // Update sprite sizes proportionally with adaptive scaling
  // 🎮 CHARACTER & PEARL SIZE ADJUSTMENT LOCATION
  // ============================================
  // To make characters 10% smaller: change 0.90 to 0.80
  // To make characters bigger: change 0.90 to 1.00 or higher
  // For heterogeneous scaling based on map size, uncomment the complexity-based scaling below
  
  let spriteScale = Math.max(0.5, Math.min(3, keySize / 50)); // Base key size is 50px
  
  // 🔧 SPECIAL CHARACTER SIZE REDUCTION ONLY FOR HJKL MAP
  // Check if this is the specific hjkl tutorial map (45 cells: 5x9)
  logger.debug(`🔍 SPRITE DEBUG: mapComplexity=${mapComplexity}, mapRows=${mapRows}, mapCols=${mapCols}, spriteScale=${spriteScale}`);
  if (mapComplexity === 45 && mapRows === 5 && mapCols === 9) {
    logger.debug(`🎯 HJKL MAP SPRITE DETECTED! Original spriteScale: ${spriteScale}`);
    // Make characters bigger for better visibility
    spriteScale = 0.8; // Bigger characters while keeping them reasonable
    logger.debug(`🎯 HJKL MAP SPRITE: New spriteScale: ${spriteScale}`);
  }
  
  // All other maps keep their original perfect character sizes
  
  // 🔧 HETEROGENEOUS SCALING - Make characters bigger on medium/large maps
  // Skip this scaling for the hjkl map (already handled above)
  if (!(mapComplexity === 45 && mapRows === 5 && mapCols === 9)) {
    // Detect screen size to adjust character scaling
    const screenWidth = window.innerWidth;
    const isLargeScreen = screenWidth > 1400; // Big computer screens
    
    if (mapComplexity >= RESPONSIVE_CONFIG.ADAPTIVE_SCALING.COMPLEXITY_THRESHOLDS.MASSIVE) {
      spriteScale = spriteScale * 1.4; // 40% bigger for massive maps
    } else if (mapComplexity >= RESPONSIVE_CONFIG.ADAPTIVE_SCALING.COMPLEXITY_THRESHOLDS.LARGE) {
      spriteScale = spriteScale * 1.3; // 30% bigger for large maps
    } else if (mapComplexity >= RESPONSIVE_CONFIG.ADAPTIVE_SCALING.COMPLEXITY_THRESHOLDS.MEDIUM) {
      spriteScale = spriteScale * 1.2; // 20% bigger for medium maps
    } else {
      // Small maps: reduce character size on large screens
      if (isLargeScreen && mapComplexity < 100) {
        spriteScale = spriteScale * 0.7; // 30% smaller for small maps on big screens
        logger.debug(`🖥️ LARGE SCREEN: Reducing character size for small map (${mapComplexity} cells)`);
      } else {
        spriteScale = spriteScale * 1.0; // Normal size for small maps on normal screens
      }
    }
    logger.debug(`🎮 HETEROGENEOUS SCALING: mapComplexity=${mapComplexity}, screenWidth=${screenWidth}, final spriteScale=${spriteScale}`);
  }
  
  root.style.setProperty('--sprite-scale', spriteScale);
  
  // Apply the sizing to all keys
  const keys = keyboardMap.querySelectorAll('.key');
  keys.forEach(key => {
    key.style.width = `${keySize}px`;
    key.style.height = `${keySize}px`;
  });
  
  // Update gaps
  keyboardMap.style.gap = `${gapSize}px`;
  keyboardRows.forEach(row => {
    row.style.gap = `${gapSize}px`;
  });
  
  // Store current map dimensions for future reference
  root.style.setProperty('--map-rows', mapRows);
  root.style.setProperty('--map-cols', mapCols);
  root.style.setProperty('--map-complexity', mapComplexity);
  
  // Apply row width constraints for vim-like grid alignment
  keyboardRows.forEach(row => {
    row.style.width = `calc(${mapCols} * (${keySize}px + ${gapSize}px) - ${gapSize}px)`;
    row.style.minWidth = row.style.width;
  });
  
  // Update paragraph separation if paragraph module is available
  if (window.paragraphModule && window.paragraphModule.updateParagraphSeparationAfterMapChange) {
    window.paragraphModule.updateParagraphSeparationAfterMapChange();
  }
  
  // Update line numbers scaling if line numbers module is available
  if (window.lineNumbersModule && window.lineNumbersModule.updateLineNumbersScaling) {
    window.lineNumbersModule.updateLineNumbersScaling();
  }
  
  // Update relative line numbers scaling if relative line numbers module is available
  if (window.relativeLineNumbersModule && window.relativeLineNumbersModule.updateRelativeLineNumbersScaling) {
    window.relativeLineNumbersModule.updateRelativeLineNumbersScaling();
  }
  
  // Keep original vim-like alignment for all maps
  keyboardMap.style.alignItems = 'flex-start';
}

function applyResponsiveAlignment(mapComplexity, mapCols, mapRows) {
  const gameBoard = document.querySelector('.game-board');
  if (!gameBoard) return;
  
  const config = RESPONSIVE_CONFIG.ADAPTIVE_SCALING;
  const isFullscreen = document.body.classList.contains('fullscreen-mode');
  
  if (!isFullscreen) {
    // Normal screen positioning - keep some centering for wide maps
    if (mapCols >= 45) {
      // Extremely wide maps (45+ letters): position at 25% from left (first quarter)
      gameBoard.style.paddingLeft = '25%';
      gameBoard.style.paddingRight = '2%';
      logger.debug(`🚨 NORMAL - EXTREME MAP: ${mapCols} letters, 25% from left (quarter screen)`);
    } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.LARGE || mapCols > 30) {
      // Very large maps: move far left to prevent overflow
      gameBoard.style.paddingLeft = '1%';
      gameBoard.style.paddingRight = '1%';
      logger.debug(`🔄 NORMAL - VERY LARGE MAP: ${mapCols} letters, far left (1% padding)`);
    } else if (mapCols > 25) {
      // Large maps: move left to prevent overflow
      gameBoard.style.paddingLeft = '2%';
      gameBoard.style.paddingRight = '2%';
      logger.debug(`🔄 NORMAL - LARGE MAP: ${mapCols} letters, left (2% padding)`);
    } else if (mapCols > 18) {
      // Medium large maps: moderate left positioning
      gameBoard.style.paddingLeft = '5%';
      gameBoard.style.paddingRight = '3%';
      logger.debug(`🔄 NORMAL - MEDIUM LARGE: ${mapCols} letters, moderate left (5% padding)`);
    } else if (mapCols > 12) {
      // Medium wide maps: moderate left positioning
      gameBoard.style.paddingLeft = '8%';
      gameBoard.style.paddingRight = '5%';
      logger.debug(`🔄 NORMAL - MEDIUM MAP: ${mapCols} letters, moderate left (8% padding)`);
    } else {
      // Small maps: reset to CSS default (centered)
      gameBoard.style.paddingLeft = '';
      gameBoard.style.paddingRight = '';
      gameBoard.style.justifyContent = 'center';
      logger.debug(`🔄 NORMAL - SMALL MAP: ${mapCols} letters, centered (CSS default)`);
    }
  } else {
    // Fullscreen: extremely aggressive positioning for wide maps
    if (mapCols >= 45) {
      // Extremely wide maps (45+ letters): move almost to edge
      gameBoard.style.paddingLeft = '0.5%';
      gameBoard.style.paddingRight = '0.5%';
      logger.debug(`🚨 FULLSCREEN - EXTREME MAP: ${mapCols} letters, almost edge (0.5% padding)`);
    } else if (mapComplexity >= config.COMPLEXITY_THRESHOLDS.LARGE || mapCols > 30) {
      // Very large maps: move far left with minimal padding
      gameBoard.style.paddingLeft = '1%';
      gameBoard.style.paddingRight = '1%';
      logger.debug(`🔄 FULLSCREEN - VERY LARGE MAP: ${mapCols} letters, far left (1% padding)`);
    } else if (mapCols > 25) {
      // Large maps: move left to prevent overflow
      gameBoard.style.paddingLeft = '2%';
      gameBoard.style.paddingRight = '1%';
      logger.debug(`🔄 FULLSCREEN - LARGE MAP: ${mapCols} letters, left (2% padding)`);
    } else if (mapCols > 16) {
      // Medium large maps: move left to prevent overflow
      gameBoard.style.paddingLeft = '3%';
      gameBoard.style.paddingRight = '2%';
      logger.debug(`🔄 FULLSCREEN - MEDIUM LARGE: ${mapCols} letters, left (3% padding)`);
    } else if (mapCols > 12) {
      // Medium maps: moderate positioning
      gameBoard.style.paddingLeft = '8%';
      gameBoard.style.paddingRight = '3%';
      logger.debug(`🔄 FULLSCREEN - MEDIUM MAP: ${mapCols} letters, moderate left (8% padding)`);
    } else {
      // Small maps: use adjusted CSS positioning (20% from left)
      gameBoard.style.paddingLeft = '20%';
      gameBoard.style.paddingRight = '5%';
      logger.debug(`🔄 FULLSCREEN - SMALL MAP: ${mapCols} letters, 20% from left`);
    }
  }
}

export function applyInitialScaling() {
  // Apply initial scaling and set up continuous responsiveness
  setTimeout(() => {
    applyScaling();
    setInitialScaleApplied(true);
    
    // Apply Safari-specific fixes after initial scaling
    setTimeout(() => {
      fixSafariInitialPositioning();
    }, 100); // Small delay to ensure scaling is complete
    
    // Set up resize listener for continuous responsiveness
    setupResizeListener();
  }, RESPONSIVE_CONFIG.TIMING.INITIAL_DELAY_MS);
}

export function updateScalingAfterMapChange() {
  // Allow scaling updates after map changes for proper responsiveness
  if (hasInitialScaleApplied()) {
    // Debounce the scaling to prevent excessive updates
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      applyScaling();
      
      // Apply Safari-specific fixes after map change
      setTimeout(() => {
        fixSafariInitialPositioning();
      }, 50);
    }, 100);
  }
}

// Function to detect and adapt to map dimension changes
export function detectMapChanges() {
  const keyboardMap = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.KEYBOARD_MAP);
  if (!keyboardMap) return;
  
  const rows = keyboardMap.querySelectorAll('.keyboard-row');
  if (rows.length === 0) return;
  
  const currentRows = rows.length;
  let currentMaxCols = 0;
  
  rows.forEach(row => {
    const keysInRow = row.querySelectorAll('.key').length;
    currentMaxCols = Math.max(currentMaxCols, keysInRow);
  });
  
  const root = document.documentElement;
  const previousRows = parseInt(root.style.getPropertyValue('--map-rows')) || 0;
  const previousCols = parseInt(root.style.getPropertyValue('--map-cols')) || 0;
  
  // If map dimensions changed, trigger responsive scaling
  if (currentRows !== previousRows || currentMaxCols !== previousCols) {
    logger.debug(`Map dimensions changed: ${previousRows}x${previousCols} → ${currentRows}x${currentMaxCols}`);
    updateScalingAfterMapChange();
  }
}

// Set up automatic map change detection
export function setupMapChangeDetection() {
  // Use MutationObserver to detect changes to the keyboard map
  const keyboardMap = document.querySelector(RESPONSIVE_CONFIG.SELECTORS.KEYBOARD_MAP);
  if (!keyboardMap) return;
  
  const observer = new MutationObserver(() => {
    detectMapChanges();
  });
  
  observer.observe(keyboardMap, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-map', 'data-letter']
  });
  
  logger.debug('Map change detection initialized');
}

function setupResizeListener() {
  // Set up debounced resize listener for continuous responsiveness
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      logger.debug('Window resize detected, applying scaling...');
      applyScaling();
    }, RESPONSIVE_CONFIG.TIMING.RESIZE_DEBOUNCE_MS);
  });
  
  // Handle orientation changes on mobile devices
  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      logger.debug('Orientation change detected, applying scaling...');
      applyScaling();
    }, RESPONSIVE_CONFIG.TIMING.RESIZE_DEBOUNCE_MS + 100);
  });
  
  // Handle visibility changes (when switching tabs/apps)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        logger.debug('Visibility change detected, applying scaling...');
        applyScaling();
      }, RESPONSIVE_CONFIG.TIMING.RESIZE_DEBOUNCE_MS);
    }
  });
  
  // Set up additional resize detection for better responsiveness
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  
  setInterval(() => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
      lastWidth = currentWidth;
      lastHeight = currentHeight;
      
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        logger.debug('Size change detected via polling, applying scaling...');
        applyScaling();
      }, 50);
    }
  }, 250);
}

// Export function to manually trigger scaling (useful for fullscreen toggle)
export function triggerScaling() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    applyScaling();
  }, 50);
}

// Force immediate scaling without debouncing (for critical updates)
export function forceScaling() {
  clearTimeout(resizeTimeout);
  applyScaling();
}

// Initialize CSS custom properties with default values
export function initializeScalingVariables() {
  const root = document.documentElement;
  root.style.setProperty('--key-size', '50px');
  root.style.setProperty('--key-gap', '4px');
  root.style.setProperty('--key-font-size', '1.2rem');
  root.style.setProperty('--sprite-scale', '1');
  root.style.setProperty('--sprite-multiplier', '1.05');
}

// Safari-specific fix for initial positioning alignment
export function fixSafariInitialPositioning() {
  // Enhanced Safari detection (including Safari on iOS)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                   /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isSafari) {
    logger.debug('Safari/iOS detected, applying initial positioning fixes...');
    
    // Wait for elements to be fully rendered
    const waitForElements = () => {
      const sprites = document.querySelectorAll('.boba-character, .pearl, .enemy, .pearl-mold');
      
      if (sprites.length === 0) {
        // Elements not ready yet, try again
        setTimeout(waitForElements, 50);
        return;
      }
      
      sprites.forEach(sprite => {
        // Force Safari to recalculate positioning with multiple techniques
        const computedStyle = window.getComputedStyle(sprite);
        const currentTransform = computedStyle.transform;
        
        // Method 1: Force reflow by reading layout properties
        sprite.offsetHeight;
        sprite.offsetWidth;
        
        // Method 2: Temporarily modify transform to trigger recalculation
        sprite.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // Method 3: Force repaint by temporarily changing opacity
        const originalOpacity = sprite.style.opacity;
        sprite.style.opacity = '0.999';
        
        // Method 4: Use requestAnimationFrame to ensure proper timing
        requestAnimationFrame(() => {
          // Restore transform if it was originally set
          if (currentTransform && currentTransform !== 'none') {
            sprite.style.transform = '';
          }
          
          // Restore opacity
          sprite.style.opacity = originalOpacity || '';
          
          // Force another reflow
          sprite.offsetHeight;
        });
      });
      
      // Force recalculation of CSS custom properties with delays
      const root = document.documentElement;
      const currentSpriteScale = root.style.getPropertyValue('--sprite-scale') || '1';
      const currentSpriteMultiplier = root.style.getPropertyValue('--sprite-multiplier') || '1.05';
      
      // Temporarily reset and then restore CSS custom properties
      root.style.setProperty('--sprite-scale', '1');
      root.style.setProperty('--sprite-multiplier', '1');
      
      requestAnimationFrame(() => {
        root.style.setProperty('--sprite-scale', currentSpriteScale);
        root.style.setProperty('--sprite-multiplier', currentSpriteMultiplier);
        
        // Final reflow after all positioning is complete
        requestAnimationFrame(() => {
          document.body.offsetHeight; // Force full layout recalculation
          logger.debug('Safari initial positioning fixes applied');
        });
      });
    };
    
    // Start the process
    waitForElements();
  }
}

