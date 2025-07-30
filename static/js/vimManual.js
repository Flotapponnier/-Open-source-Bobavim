// ================================
// RETRO VIM MANUAL BOOK MODULE
// ================================

function getVimManualElements() {
  return {
    bookIcon: document.getElementById("instructionsBook"),
    modal: document.getElementById("vimManualModal"),
    closeBtn: document.getElementById("closeManual"),
    helpText: document.getElementById("helpText"),
    bookContent: document.querySelector(".book-content"),
    bookCover: document.querySelector(".book-cover")
  };
}

function openModal(modal, bookContent, bookCover) {
  logger.debug("Opening retro vim manual book");
  modal.classList.remove("hidden");
  
  // Animate book opening
  setTimeout(() => {
    if (bookContent) {
      bookContent.classList.add("open");
    }
    showPage('page-1');
  }, 300);
}

function closeModal(modal, bookContent) {
  logger.debug("Closing retro vim manual book");
  
  // Close book animation
  if (bookContent) {
    bookContent.classList.remove("open");
  }
  
  // Hide modal after animation
  setTimeout(() => {
    modal.classList.add("hidden");
    // Reset to first page
    showPage('page-1');
  }, 600);
}

function showPage(pageClass) {
  logger.debug(`Showing page: ${pageClass}`);
  
  // Hide all pages
  const allPages = document.querySelectorAll('.book-page');
  allPages.forEach(page => {
    page.classList.remove('active');
    page.classList.add('hidden');
  });
  
  // Show the selected page
  const targetPage = document.querySelector(`.${pageClass}`);
  if (targetPage) {
    setTimeout(() => {
      targetPage.classList.remove('hidden');
      targetPage.classList.add('active');
    }, 200);
  }
}

let bookAnimationActive = false;

export function animateHelpText(helpText) {
  logger.debug("Changing header message (space+h key)");
  helpText.textContent = "READ THE FUCKING MANUAL 😡";
  
  // Animate the book icon with infinite golden effect
  startInfiniteBookAnimation();
  
  // Keep the angry text, don't change it back
}

export function startInfiniteBookAnimation() {
  const bookIcon = document.getElementById("instructionsBook");
  if (!bookIcon) {
    logger.warn("Book icon not found");
    return;
  }
  
  // Stop any existing animation
  stopBookAnimation();
  
  bookAnimationActive = true;
  
  // Add CSS animation for infinite pulsing (keep original golden effect)
  const style = document.createElement('style');
  style.id = 'book-animation-style';
  style.textContent = `
    @keyframes bookPulse {
      0% { 
        transform: scale(1);
        filter: drop-shadow(0 0 5px #FFD700);
      }
      50% { 
        transform: scale(1.3);
        filter: drop-shadow(0 0 15px #FFD700) drop-shadow(0 0 25px #FFD700);
      }
      100% { 
        transform: scale(1);
        filter: drop-shadow(0 0 5px #FFD700);
      }
    }
    
    .book-pulsing {
      animation: bookPulse 1.5s ease-in-out infinite;
      color: #FFD700 !important;
    }
  `;
  document.head.appendChild(style);
  
  // Apply the animation class
  bookIcon.classList.add('book-pulsing');
}

export function stopBookAnimation() {
  const bookIcon = document.getElementById("instructionsBook");
  const existingStyle = document.getElementById('book-animation-style');
  
  if (bookIcon) {
    bookIcon.classList.remove('book-pulsing');
    bookIcon.style.transform = "";
    bookIcon.style.filter = "";
    bookIcon.style.color = "";
  }
  
  if (existingStyle) {
    existingStyle.remove();
  }
  
  bookAnimationActive = false;
}

export function isBookAnimationActive() {
  return bookAnimationActive;
}

function handleKeydown(e, modal, bookContent) {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    logger.debug("Closing retro vim manual (escape key)");
    closeModal(modal, bookContent);
  }
}

function setupPageNavigation() {
  // Show Keymap Guide button (Page 1 -> Page 2)
  const showKeymapBtn = document.getElementById("showKeymapBtn");
  if (showKeymapBtn) {
    showKeymapBtn.addEventListener("click", () => {
      logger.debug("Showing keymap guide");
      showPage('page-2');
    });
  }
  
  // See Vim Motions button (Page 2 -> Page 3)
  const showMotionsBtn = document.getElementById("showMotionsBtn");
  if (showMotionsBtn) {
    showMotionsBtn.addEventListener("click", () => {
      logger.debug("Showing vim motions");
      showPage('page-3');
    });
  }
  
  // Back to Config button (Page 4 -> Page 2)
  const backToConfigBtn = document.getElementById("backToConfigBtn");
  if (backToConfigBtn) {
    backToConfigBtn.addEventListener("click", () => {
      logger.debug("Going back to config");
      showPage('page-2');
    });
  }

  // Score Attribution button (Page 3 -> Page 4)
  const toScoreAttributionBtn = document.getElementById("toScoreAttributionBtn");
  if (toScoreAttributionBtn) {
    toScoreAttributionBtn.addEventListener("click", () => {
      logger.debug("Going to score attribution");
      showPage('page-4');
    });
  }

  // Back to Commands button (Page 4 -> Page 3)
  const backToCommandsBtn = document.getElementById("backToCommandsBtn");
  if (backToCommandsBtn) {
    backToCommandsBtn.addEventListener("click", () => {
      logger.debug("Going back to commands");
      showPage('page-3');
    });
  }

}

export function initializeVimManual() {
  // Skip initialization in multiplayer mode
  if (window.IS_MULTIPLAYER) {
    logger.debug("Skipping vim manual initialization - multiplayer mode detected");
    return;
  }

  logger.debug("Initializing retro vim manual book...");

  const { bookIcon, modal, closeBtn, helpText, bookContent, bookCover } = getVimManualElements();

  if (!bookIcon || !modal || !closeBtn) {
    logger.warn("Vim manual elements not found");
    return;
  }

  // Book icon click - open the book
  bookIcon.addEventListener("click", () => {
    stopBookAnimation();
    openModal(modal, bookContent, bookCover);
  });
  
  // Close button click - close the book
  closeBtn.addEventListener("click", () => closeModal(modal, bookContent));
  
  // Click outside modal to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      logger.debug("Closing retro vim manual (clicked outside)");
      closeModal(modal, bookContent);
    }
  });

  // Setup page navigation
  setupPageNavigation();

  // Keyboard event handler
  document.addEventListener("keydown", (e) => handleKeydown(e, modal, bookContent));
  
  logger.debug("Retro vim manual book initialized successfully");
}