import { AUTH_CONFIG } from "./index_constants/auth.js";
import { migrateGuestProgressToAccount, refreshProgression } from "./mapSelection_submodule/mapProgressionManager.js";
import { unlockAllCharacters, lockPremiumCharacters, lockPaidCharacters } from "./characterSelection.js";
import { clearMapCache } from "./mapSelection.js";

// Import auth vim navigation module directly
let authVimModule = null;
import('./authVimNavigation.js').then(module => {
  authVimModule = module;
  logger.debug('Auth: authVimNavigation module loaded at startup');
}).catch(error => {
  logger.error('Auth: Failed to load authVimNavigation module:', error);
});

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return currentUser !== null;
}

export async function verifyAuthenticationStatus() {
  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.ME, { credentials: 'include' });
    const data = await response.json();
    
    if (data.success && data.authenticated) {
      currentUser = data.user;
      return true;
    } else {
      currentUser = null;
      return false;
    }
  } catch (error) {
    logger.error("Error verifying auth status:", error);
    currentUser = null;
    return false;
  }
}

export function initializeAuth() {
  logger.debug("Initializing authentication...");

  const modal = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.MODAL);
  const registrationForm = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.REGISTRATION_FORM,
  );
  const loginForm = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.LOGIN_FORM);
  const logoutButton = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.LOGOUT_BUTTON,
  );
  const loginButton = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.LOGIN_BUTTON,
  );
  const registerButton = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.REGISTER_BUTTON,
  );
  const switchToLogin = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.SWITCH_TO_LOGIN,
  );
  const switchToRegister = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.SWITCH_TO_REGISTER,
  );
  const switchToForgotPassword = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.SWITCH_TO_FORGOT_PASSWORD,
  );

  // Early return if essential auth elements are not present (e.g., on game pages)
  if (!modal) {
    logger.debug("Auth modal not found - skipping auth initialization (likely on game page)");
    return;
  }

  const switchToLoginFromForgot = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.SWITCH_TO_LOGIN_FROM_FORGOT,
  );
  const forgotPasswordForm = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.FORGOT_PASSWORD_FORM,
  );

  checkAuthStatus();

  if (registrationForm) {
    registrationForm.addEventListener("submit", handleRegistration);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPassword);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (loginButton) {
    loginButton.addEventListener("click", () => showAuthModal("login"));
  }

  if (registerButton) {
    registerButton.addEventListener("click", () => showAuthModal("register"));
  }

  if (switchToLogin) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("login");
    });
  }

  if (switchToRegister) {
    switchToRegister.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("register");
    });
  }

  if (switchToForgotPassword) {
    switchToForgotPassword.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("forgotPassword");
    });
  }

  if (switchToLoginFromForgot) {
    switchToLoginFromForgot.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("login");
    });
  }

  window.closeAuthModal = () => {
    modal.classList.add("hidden");
    clearAuthError();
    
    // Re-enable vim navigation when modal is closed
    if (window.showCursor) {
      window.showCursor();
    }
    import('./vimNavigation.js').then(module => {
      module.enableVimNavigation();
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  };

  // Make showAuthModal globally available for other components
  window.showAuthModal = showAuthModal;

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAuthModal();
      }
    });
  }

  // Listen for custom events from leaderboard and other components
  document.addEventListener('showAuthModal', (e) => {
    const tab = e.detail?.tab || 'register';
    showAuthModal(tab);
  });
}

export function showAuthModal(mode = "register") {
  logger.debug("Auth: showAuthModal called with mode:", mode);
  const modal = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.MODAL);
  modal.classList.remove("hidden");
  switchAuthForm(mode);
  
  // Disable main vim navigation when modal is open
  if (window.hideCursor) {
    window.hideCursor();
    // Also disable the navigation completely for true modals
    setTimeout(() => {
      import('./vimNavigation.js').then(module => {
        module.disableVimNavigation();
      }).catch(() => {});
    }, 0);
  } else {
    import('./vimNavigation.js').then(module => {
      module.disableVimNavigation();
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  }
  
  // Initialize auth vim navigation with longer delay for animations
  setTimeout(() => {
    logger.debug('Auth: About to initialize auth vim, module available:', !!authVimModule);
    if (authVimModule) {
      try {
        logger.debug('Auth: Calling initializeAuthVim with mode:', mode);
        authVimModule.initializeAuthVim(mode);
        logger.debug('Auth: initializeAuthVim called successfully');
        // Refresh cursor position after a bit more delay to account for CSS animations
        setTimeout(() => {
          logger.debug('Auth: About to refresh cursor');
          authVimModule.refreshAuthCursor();
        }, 200);
      } catch (error) {
        logger.error('Auth: Error initializing auth vim:', error);
      }
    } else {
      logger.warn('Auth: authVimModule not loaded yet, trying dynamic import');
      import('./authVimNavigation.js').then(module => {
        logger.debug('Auth: Module imported successfully, calling initializeAuthVim');
        try {
          module.initializeAuthVim(mode);
          logger.debug('Auth: initializeAuthVim called successfully');
          setTimeout(() => {
            module.refreshAuthCursor();
          }, 200);
        } catch (error) {
          logger.error('Auth: Error initializing auth vim:', error);
        }
      }).catch((error) => {
        logger.error('Auth: Failed to import auth vim navigation:', error);
      });
    }
  }, 150); // Increased delay for better alignment
}

function switchAuthForm(mode) {
  const registrationForm = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.REGISTRATION_FORM,
  );
  const loginForm = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.LOGIN_FORM);
  const forgotPasswordForm = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.FORGOT_PASSWORD_FORM,
  );
  const modalTitle = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.MODAL_TITLE,
  );

  // Hide all forms first
  registrationForm.classList.add("hidden");
  loginForm.classList.add("hidden");
  forgotPasswordForm.classList.add("hidden");

  if (mode === "login") {
    loginForm.classList.remove("hidden");
    modalTitle.textContent = AUTH_CONFIG.MESSAGES.LOGIN_TITLE;
  } else if (mode === "forgotPassword") {
    forgotPasswordForm.classList.remove("hidden");
    modalTitle.textContent = AUTH_CONFIG.MESSAGES.FORGOT_PASSWORD_TITLE;
  } else {
    registrationForm.classList.remove("hidden");
    modalTitle.textContent = AUTH_CONFIG.MESSAGES.REGISTER_TITLE;
  }
  
  // Update auth vim navigation for new mode
  if (authVimModule) {
    authVimModule.updateAuthVimForMode(mode);
  } else {
    import('./authVimNavigation.js').then(module => {
      module.updateAuthVimForMode(mode);
    }).catch(() => {
      // Ignore if auth vim navigation is not available
    });
  }

  clearAuthError();
}

async function checkAuthStatus() {
  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.ME);
    const data = await response.json();

    if (data.success && data.authenticated) {
      currentUser = data.user;
      updateUIForLoggedInUser(data.user);
    } else {
      currentUser = null;
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    logger.error("Error checking auth status:", error);
    currentUser = null;
    updateUIForLoggedOutUser();
  }
}

function updateUIForLoggedInUser(user) {
  const userPanel = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.USER_PANEL);
  const loggedUsername = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.LOGGED_USERNAME,
  );
  const authButtons = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.AUTH_BUTTONS,
  );

  if (userPanel && loggedUsername) {
    loggedUsername.textContent = user.username;
    userPanel.classList.remove("hidden");
  }

  if (authButtons) {
    authButtons.classList.add("hidden");
  }

  if (user.is_registered) {
    unlockAllCharacters();
  }
}

function updateUIForLoggedOutUser() {
  const userPanel = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.USER_PANEL);
  const authButtons = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.AUTH_BUTTONS,
  );

  if (userPanel) {
    userPanel.classList.add("hidden");
  }

  if (authButtons) {
    authButtons.classList.remove("hidden");
  }

  lockPremiumCharacters();
  lockPaidCharacters();
}

async function handleRegistration(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const registrationData = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.REGISTER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      updateUIForLoggedInUser(data.user);
      closeAuthModal();

      // Add a small delay to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh progression first to establish authenticated state
      await refreshProgression();
      
      // Migrate guest progress to new account
      try {
        const migrationResult = await migrateGuestProgressToAccount();
        if (migrationResult.success && migrationResult.message !== 'No progress to migrate') {
          logger.info("Guest progress migrated successfully:", migrationResult.message);
        }
      } catch (error) {
        logger.error("Failed to migrate guest progress:", error);
      }

      // Refresh progression data again after migration
      await refreshProgression();
      
      // Clear map cache to force refresh of map selection
      try {
        clearMapCache();
      } catch (error) {
        logger.error("Failed to clear map cache:", error);
      }

      alert(AUTH_CONFIG.MESSAGES.REGISTRATION_SUCCESS);
    } else {
      showAuthError(data.error || "Registration failed");
    }
  } catch (error) {
    logger.error("Registration error:", error);
    showAuthError(AUTH_CONFIG.MESSAGES.NETWORK_ERROR);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const loginData = {
    username: formData.get("username"),
    password: formData.get("password"),
  };

  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.user;
      updateUIForLoggedInUser(data.user);
      closeAuthModal();

      // Refresh progression first to establish authenticated state
      await refreshProgression();
      
      // Migrate guest progress to existing account
      try {
        const migrationResult = await migrateGuestProgressToAccount();
        if (migrationResult.success && migrationResult.message !== 'No progress to migrate') {
          logger.info("Guest progress migrated successfully:", migrationResult.message);
        }
      } catch (error) {
        logger.error("Failed to migrate guest progress:", error);
      }

      // Final refresh after migration
      await refreshProgression();
      
      // Clear map cache to force refresh of map selection
      try {
        clearMapCache();
      } catch (error) {
        logger.error("Failed to clear map cache:", error);
      }
    } else {
      showAuthError(data.error || "Login failed");
    }
  } catch (error) {
    logger.error("Login error:", error);
    showAuthError(AUTH_CONFIG.MESSAGES.NETWORK_ERROR);
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const email = formData.get("email");

  // Basic email validation
  if (!email || !email.trim()) {
    showAuthError("Please enter your email address");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError("Please enter a valid email address");
    return;
  }

  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      showAuthError(AUTH_CONFIG.MESSAGES.FORGOT_PASSWORD_SUCCESS);
      // Switch back to login form after a short delay
      setTimeout(() => {
        switchAuthForm("login");
      }, 3000);
    } else {
      showAuthError(data.error || "Failed to send reset email. Please try again later.");
    }
  } catch (error) {
    logger.error("Forgot password error:", error);
    showAuthError("Network error. Please check your connection and try again.");
  }
}

async function handleLogout() {
  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.LOGOUT, {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      currentUser = null;
      updateUIForLoggedOutUser();
      
      // Refresh map progression to update locked/unlocked status
      try {
        await refreshProgression();
        
        // Clear map cache to force refresh of map selection
        clearMapCache();
      } catch (error) {
        logger.error("Failed to refresh progression after logout:", error);
      }
    }
  } catch (error) {
    logger.error("Logout error:", error);
  }
}

function showAuthError(message) {
  const errorDiv = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.AUTH_ERROR);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    errorDiv.style.display = "block";
    errorDiv.style.visibility = "visible";
  }
}

function clearAuthError() {
  const errorDiv = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.AUTH_ERROR);
  if (errorDiv) {
    errorDiv.classList.add("hidden");
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
  }
}

function closeAuthModal() {
  logger.debug("Auth: closeAuthModal called");
  
  const modal = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.MODAL);
  const wasClosedViaCancel = window.authModalClosingViaCancel;
  window.authModalClosingViaCancel = false; // Reset flag immediately
  
  // Only do aggressive cleanup if closed via cancel button
  if (wasClosedViaCancel) {
    logger.debug("Auth: Modal closed via cancel - doing aggressive cleanup");
    
    // Clear selections
    if (window.getSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.empty && selection.empty();
    }
    
    // Force blur ALL inputs immediately
    document.querySelectorAll('input, textarea').forEach(input => {
      try {
        input.blur();
        if (input.setSelectionRange) {
          input.setSelectionRange(0, 0);
        }
        input.style.outline = '';
      } catch (e) {}
    });
    
    // Force focus to body
    document.body.focus();
  } else {
    logger.debug("Auth: Normal modal close - minimal cleanup");
  }
  
  // Disable auth vim navigation first
  if (authVimModule) {
    logger.debug("Auth: Calling disableAuthVim on preloaded module");
    authVimModule.disableAuthVim();
  } else {
    logger.debug("Auth: authVimModule not available, trying dynamic import for disable");
    import('./authVimNavigation.js').then(module => {
      logger.debug("Auth: Calling disableAuthVim");
      module.disableAuthVim();
    }).catch(() => {
      // Ignore if auth vim navigation is not available
    });
  }
  
  modal.classList.add("hidden");
  clearAuthError();
  
  // Only do extensive cleanup if closed via cancel
  if (wasClosedViaCancel) {
    setTimeout(() => {
      // Clear all text selections
      if (window.getSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.empty && selection.empty(); // IE compatibility
      }
      
      // Clear selection in all possible ways
      if (document.selection) {
        document.selection.empty(); // IE
      }
      
      // Remove focus from any active element
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      
      // Force focus back to body to clear any input focus
      document.body.focus();
      
      // Force repaint to clear visual artifacts
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
      
      // Clear any lingering focus rings or selections
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.style) {
          el.style.outline = '';
          el.style.outlineOffset = '';
          el.style.boxShadow = '';
        }
        if (el.blur && typeof el.blur === 'function') {
          try {
            el.blur();
          } catch (e) {
            // Ignore errors
          }
        }
      });
      
      // Specifically clear all text inputs and their selections
      const allInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
      allInputs.forEach(input => {
        try {
          input.blur();
          if (input.setSelectionRange) {
            input.setSelectionRange(0, 0);
          }
          input.style.outline = '';
          input.style.boxShadow = '';
          input.style.border = '';
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Force clear any remaining browser text selection
      if (window.getSelection) {
        setTimeout(() => {
          window.getSelection().removeAllRanges();
        }, 10);
      }
      
      logger.debug("Auth: Cleared all selections, focus, and forced repaint");
    }, 50);
  }
  
  // Re-enable main vim navigation when modal is closed
  setTimeout(() => {
    logger.debug("Auth: Re-enabling main vim navigation after modal close");
    
    import('./vimNavigation.js').then(module => {
      if (wasClosedViaCancel) {
        logger.debug("Auth: Was closed via cancel - doing full reset");
        // Full reset only if closed via cancel button
        module.disableVimNavigation();
        module.hideCursor();
        
        // Force remove any lingering cursors
        document.querySelectorAll('.vim-cursor, .auth-vim-cursor').forEach(cursor => cursor.remove());
        
        // Clear any vim text modifications
        document.querySelectorAll('[data-original-text], [data-original-auth-text]').forEach(el => {
          const originalText = el.getAttribute('data-original-text') || el.getAttribute('data-original-auth-text');
          if (originalText) {
            el.textContent = originalText;
            el.removeAttribute('data-original-text');
            el.removeAttribute('data-original-auth-text');
          }
        });
        
        // Then re-enable with a fresh state
        setTimeout(() => {
          module.enableVimNavigation();
          module.showCursor();
          logger.debug("Auth: Main vim navigation fully reset and re-enabled");
        }, 50);
      } else {
        logger.debug("Auth: Normal close - simple re-enable");
        // Normal re-enable for other close methods
        module.enableVimNavigation();
        module.showCursor();
      }
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  }, 100); // Small delay to ensure auth vim is fully disabled first
}
