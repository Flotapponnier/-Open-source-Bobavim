export const gameState = {
  tutorialMode: false,
};

export function initializeGame() {
  logger.debug("Boba.vim Text Adventure loaded");
  
  // Apply character-specific game board styling
  applyCharacterGameBoardStyling();
}

function applyCharacterGameBoardStyling() {
  const gameBoard = document.querySelector('.game-board');
  if (!gameBoard) return;
  
  // Get selected character from localStorage or default to 'boba'
  const selectedCharacter = localStorage.getItem('boba_vim_selected_character') || 'boba';
  
  // Remove any existing character-specific classes
  const existingClasses = ['game-board-boba', 'game-board-pinky', 'game-board-golden', 'game-board-black', 'game-board-boba_diamond'];
  existingClasses.forEach(cls => gameBoard.classList.remove(cls));
  
  // Add the new character-specific class
  gameBoard.classList.add(`game-board-${selectedCharacter}`);
  
  logger.debug(`Applied game board styling for character: ${selectedCharacter}`);
}
