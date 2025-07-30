// ===================================
// PARAGRAPH SEPARATION MODULE
// Handles visual separation of paragraphs
// ===================================

export function initializeParagraphSeparation() {
  // Apply paragraph separation styling when the page loads
  setTimeout(() => {
    applyParagraphSeparation();
  }, 100);
}

export function applyParagraphSeparation() {
  const keyboardMap = document.querySelector('.keyboard-map');
  if (!keyboardMap) return;

  const rows = keyboardMap.querySelectorAll('.keyboard-row');
  if (rows.length === 0) return;

  logger.debug(`Analyzing ${rows.length} rows for paragraph separation`);

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) {
      // Add empty-row class for styling
      row.classList.add('empty-row');
      
      // Optional: Add visible-empty class for more prominent styling
      // Uncomment the next line if you want empty rows to have a background
      // row.classList.add('visible-empty');
      
      logger.debug(`Row ${index} marked as empty paragraph separator`);
    } else {
      // Remove empty-row classes in case they were previously applied
      row.classList.remove('empty-row', 'visible-empty');
    }
  });
}

function isRowEmpty(row) {
  const keys = row.querySelectorAll('.key');
  if (keys.length === 0) return true;

  // Check if all keys in the row are spaces or empty
  for (const key of keys) {
    const letter = key.getAttribute('data-letter');
    if (letter && letter.trim() !== '') {
      return false;
    }
  }
  
  return true;
}

export function updateParagraphSeparationAfterMapChange() {
  // Reapply paragraph separation when map changes
  setTimeout(() => {
    applyParagraphSeparation();
  }, 50);
}

// Export function to toggle visible empty rows
export function toggleVisibleEmptyRows() {
  const emptyRows = document.querySelectorAll('.keyboard-row.empty-row');
  emptyRows.forEach(row => {
    row.classList.toggle('visible-empty');
  });
  
  const isVisible = document.querySelector('.keyboard-row.empty-row.visible-empty') !== null;
  logger.debug(`Empty rows ${isVisible ? 'visible' : 'hidden'}`);
  return isVisible;
}