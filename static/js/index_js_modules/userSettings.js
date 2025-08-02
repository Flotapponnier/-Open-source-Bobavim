import { AUTH_CONFIG } from "./index_constants/auth.js";

// Import settings vim navigation module directly
let settingsVimModule = null;
import('./settingsVimNavigation.js').then(module => {
  settingsVimModule = module;
  logger.debug('Settings: settingsVimNavigation module loaded at startup');
}).catch(error => {
  logger.error('Settings: Failed to load settingsVimNavigation module:', error);
});

export function initializeUserSettings() {
  logger.debug("Initializing user settings...");

  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("userSettingsModal");
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const closeDeleteModal = document.getElementById("closeDeleteModal");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const deleteConfirmationInput = document.getElementById("deleteConfirmation");

  if (settingsButton) {
    settingsButton.addEventListener("click", openSettingsModal);
  }

  if (closeSettingsModal) {
    closeSettingsModal.addEventListener("click", closeSettings);
  }

  if (closeDeleteModal) {
    closeDeleteModal.addEventListener("click", closeDeleteConfirm);
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });
  }

  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener("click", (e) => {
      if (e.target === deleteConfirmModal) {
        closeDeleteConfirm();
      }
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handleChangePassword);
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", openDeleteConfirm);
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", handleDeleteAccount);
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", closeDeleteConfirm);
  }

  if (deleteConfirmationInput) {
    deleteConfirmationInput.addEventListener("input", validateDeleteConfirmation);
  }

  // Real-time password confirmation validation
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
  
  if (confirmNewPasswordInput && newPasswordInput) {
    confirmNewPasswordInput.addEventListener("input", function() {
      if (this.value && newPasswordInput.value !== this.value) {
        this.style.borderColor = "#e53e3e";
      } else {
        this.style.borderColor = "#ddd";
      }
    });
  }
}

async function openSettingsModal() {
  try {
    // Fetch current user data
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.ME);
    const data = await response.json();

    if (data.success && data.authenticated) {
      const user = data.user;
      
      // Update user info in modal
      document.getElementById("settingsUsername").textContent = user.username;
      document.getElementById("settingsEmail").textContent = user.email || "Not provided";
      
      // Update email confirmation status
      updateEmailConfirmationStatus(user.email_confirmed);
      
      // Get selected character from localStorage or default to 'boba'
      const selectedCharacter = localStorage.getItem("boba_vim_selected_character") || "boba";
      let avatarPath;
      let characterDisplayName;
      
      switch (selectedCharacter) {
        case "boba_diamond":
          avatarPath = `/static/sprites/avatar/diamond_boba_avatar.png`;
          characterDisplayName = "Boba Diamond";
          break;
        case "boba":
          avatarPath = `/static/sprites/avatar/boba_avatar.png`;
          characterDisplayName = "Boba";
          break;
        default:
          avatarPath = `/static/sprites/avatar/${selectedCharacter}_boba_avatar.png`;
          characterDisplayName = selectedCharacter.charAt(0).toUpperCase() + selectedCharacter.slice(1) + " Boba";
      }
      
      document.getElementById("userAvatar").src = avatarPath;
      
      // Update character name display
      const characterNameElement = document.getElementById("characterName");
      if (characterNameElement) {
        characterNameElement.textContent = characterDisplayName;
      }
      
      // Show modal
      document.getElementById("userSettingsModal").classList.remove("hidden");
      
      // Disable main vim navigation when settings modal is open
      if (window.hideCursor) {
        window.hideCursor();
        // Also disable the navigation completely for true modals
        setTimeout(() => {
          if (window.disableVimNavigation) {
            window.disableVimNavigation();
          }
        }, 0);
      }
      
      // Initialize settings vim navigation with longer delay for animations
      setTimeout(() => {
        logger.debug('Settings: About to initialize settings vim, module available:', !!settingsVimModule);
        if (settingsVimModule) {
          try {
            logger.debug('Settings: Calling initializeSettingsVim with mode: main');
            settingsVimModule.initializeSettingsVim('main');
            logger.debug('Settings: initializeSettingsVim called successfully');
            // Refresh cursor position after a bit more delay to account for CSS animations
            setTimeout(() => {
              logger.debug('Settings: About to refresh cursor');
              settingsVimModule.refreshSettingsCursor();
            }, 200);
          } catch (error) {
            logger.error('Settings: Error initializing settings vim:', error);
          }
        } else {
          logger.warn('Settings: settingsVimModule not loaded yet, trying dynamic import');
          import('./settingsVimNavigation.js').then(module => {
            logger.debug('Settings: Module imported successfully, calling initializeSettingsVim');
            try {
              module.initializeSettingsVim('main');
              logger.debug('Settings: initializeSettingsVim called successfully');
              setTimeout(() => {
                module.refreshSettingsCursor();
              }, 200);
            } catch (error) {
              logger.error('Settings: Error initializing settings vim:', error);
            }
          }).catch((error) => {
            logger.error('Settings: Failed to import settings vim navigation:', error);
          });
        }
      }, 150); // Increased delay for better alignment
      
      // Clear any previous error/success messages
      clearMessages();
    }
  } catch (error) {
    logger.error("Error loading user settings:", error);
    showError("Failed to load user settings");
  }
}

function closeSettings() {
  logger.debug("Settings: closeSettings called");
  
  const modal = document.getElementById("userSettingsModal");
  const wasClosedViaCancel = window.settingsModalClosingViaCancel;
  window.settingsModalClosingViaCancel = false; // Reset flag immediately
  
  // Disable settings vim navigation first
  if (settingsVimModule) {
    logger.debug("Settings: Calling disableSettingsVim on preloaded module");
    settingsVimModule.disableSettingsVim();
  } else {
    logger.debug("Settings: settingsVimModule not available, trying dynamic import for disable");
    import('./settingsVimNavigation.js').then(module => {
      logger.debug("Settings: Calling disableSettingsVim");
      module.disableSettingsVim();
    }).catch(() => {
      // Ignore if settings vim navigation is not available
    });
  }
  
  modal.classList.add("hidden");
  
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
      
      logger.debug("Settings: Cleared selections and focus for cancel close");
    }, 50);
  }
  
  // Re-enable main vim navigation when settings modal is closed
  setTimeout(() => {
    logger.debug("Settings: Re-enabling main vim navigation after modal close");
    
    import('./vimNavigation.js').then(module => {
      if (wasClosedViaCancel) {
        logger.debug("Settings: Was closed via cancel - doing full reset");
        // Full reset only if closed via cancel button
        module.disableVimNavigation();
        module.hideCursor();
        
        // Force remove any lingering cursors
        document.querySelectorAll('.vim-cursor, .settings-vim-cursor').forEach(cursor => cursor.remove());
        
        // Clear any vim text modifications
        document.querySelectorAll('[data-original-text], [data-original-settings-text]').forEach(el => {
          const originalText = el.getAttribute('data-original-text') || el.getAttribute('data-original-settings-text');
          if (originalText) {
            el.textContent = originalText;
            el.removeAttribute('data-original-text');
            el.removeAttribute('data-original-settings-text');
          }
        });
        
        // Then re-enable with a fresh state
        setTimeout(() => {
          module.enableVimNavigation();
          module.showCursor();
          logger.debug("Settings: Main vim navigation fully reset and re-enabled");
        }, 50);
      } else {
        logger.debug("Settings: Normal close - simple re-enable");
        // Normal re-enable for other close methods
        module.enableVimNavigation();
        module.showCursor();
      }
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  }, 100); // Small delay to ensure settings vim is fully disabled first
  
  clearMessages();
  clearPasswordForm();
}

function openDeleteConfirm() {
  logger.debug("Settings: Opening delete confirmation modal");
  document.getElementById("deleteConfirmModal").classList.remove("hidden");
  document.getElementById("deleteConfirmation").value = "";
  document.getElementById("confirmDeleteBtn").disabled = true;
  
  // Switch to delete confirmation vim navigation
  setTimeout(() => {
    logger.debug('Settings: About to initialize delete confirm vim navigation');
    if (settingsVimModule) {
      try {
        logger.debug('Settings: Calling updateSettingsVimForMode with deleteConfirm');
        settingsVimModule.updateSettingsVimForMode('deleteConfirm');
        logger.debug('Settings: Delete confirm vim navigation updated successfully');
        // Refresh cursor position after delay
        setTimeout(() => {
          settingsVimModule.refreshSettingsCursor();
        }, 100);
      } catch (error) {
        logger.error('Settings: Error updating to delete confirm vim:', error);
      }
    } else {
      logger.warn('Settings: settingsVimModule not available for delete confirm');
      import('./settingsVimNavigation.js').then(module => {
        try {
          module.initializeSettingsVim('deleteConfirm');
          setTimeout(() => {
            module.refreshSettingsCursor();
          }, 100);
        } catch (error) {
          logger.error('Settings: Error initializing delete confirm vim:', error);
        }
      }).catch((error) => {
        logger.error('Settings: Failed to import settings vim navigation for delete confirm:', error);
      });
    }
  }, 100);
}

function closeDeleteConfirm() {
  logger.debug("Settings: Closing delete confirmation modal");
  document.getElementById("deleteConfirmModal").classList.add("hidden");
  document.getElementById("deleteConfirmation").value = "";
  document.getElementById("confirmDeleteBtn").disabled = true;
  
  // Return to main settings vim navigation
  setTimeout(() => {
    logger.debug('Settings: About to return to main settings vim navigation');
    if (settingsVimModule) {
      try {
        logger.debug('Settings: Calling updateSettingsVimForMode with main');
        settingsVimModule.updateSettingsVimForMode('main');
        logger.debug('Settings: Main settings vim navigation restored successfully');
        // Refresh cursor position after delay
        setTimeout(() => {
          settingsVimModule.refreshSettingsCursor();
        }, 100);
      } catch (error) {
        logger.error('Settings: Error returning to main settings vim:', error);
      }
    }
  }, 100);
}

function validateDeleteConfirmation() {
  const input = document.getElementById("deleteConfirmation");
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  
  if (input.value.trim().toLowerCase() === "boba") {
    confirmBtn.disabled = false;
  } else {
    confirmBtn.disabled = true;
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  clearMessages();
  
  // Show loading state
  const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Updating...";
  
  // Show status message
  showPasswordStatus("Updating password...", "info");

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  // Validation
  if (newPassword.length < 8) {
    showPasswordStatus("New password must be at least 8 characters long", "error");
    resetSubmitButton(submitBtn, originalText);
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showPasswordStatus("New passwords do not match", "error");
    resetSubmitButton(submitBtn, originalText);
    return;
  }

  if (currentPassword === newPassword) {
    showPasswordStatus("New password must be different from current password", "error");
    resetSubmitButton(submitBtn, originalText);
    return;
  }

  try {
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showPasswordStatus("Password updated successfully!", "success");
      clearPasswordForm();
    } else {
      showPasswordStatus(data.error || "Failed to update password", "error");
    }
  } catch (error) {
    logger.error("Change password error:", error);
    showPasswordStatus("Network error. Please try again.", "error");
  } finally {
    resetSubmitButton(submitBtn, originalText);
  }
}

async function handleDeleteAccount() {
  try {
    const response = await fetch("/api/auth/delete-account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      alert("Account deleted successfully. You will be redirected to the home page.");
      window.location.href = "/";
    } else {
      showError(data.error || "Failed to delete account");
    }
  } catch (error) {
    logger.error("Delete account error:", error);
    showError("Network error. Please try again.");
  }
}

function clearPasswordForm() {
  document.getElementById("currentPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmNewPassword").value = "";
}

function showError(message) {
  const errorDiv = document.getElementById("settingsError");
  const successDiv = document.getElementById("settingsSuccess");
  
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  successDiv.classList.add("hidden");
}

function showSuccess(message) {
  const errorDiv = document.getElementById("settingsError");
  const successDiv = document.getElementById("settingsSuccess");
  
  successDiv.textContent = message;
  successDiv.classList.remove("hidden");
  errorDiv.classList.add("hidden");
}

function clearMessages() {
  document.getElementById("settingsError").classList.add("hidden");
  document.getElementById("settingsSuccess").classList.add("hidden");
  const passwordStatus = document.getElementById("passwordChangeStatus");
  if (passwordStatus) {
    passwordStatus.classList.add("hidden");
  }
}

function showPasswordStatus(message, type) {
  const statusDiv = document.getElementById("passwordChangeStatus");
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.classList.remove("hidden");
  }
}

function resetSubmitButton(button, originalText) {
  button.disabled = false;
  button.textContent = originalText;
}

function updateEmailConfirmationStatus(isConfirmed) {
  const statusContainer = document.getElementById("emailConfirmationStatus");
  if (!statusContainer) return;
  
  if (isConfirmed) {
    statusContainer.innerHTML = `
      <div style="color: #2ecc71; font-size: 0.9rem; margin-top: 0.5rem;">
        ✅ Email confirmed
      </div>
    `;
  } else {
    statusContainer.innerHTML = `
      <div style="color: #e74c3c; font-size: 0.9rem; margin-top: 0.5rem;">
        ❌ Please confirm your account
        <button 
          id="resendConfirmationBtn"
          style="
            background: #e67e22;
            color: white;
            border: none;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            margin-left: 0.5rem;
            transition: background 0.3s;
          "
          onmouseover="this.style.background='#d35400'"
          onmouseout="this.style.background='#e67e22'"
        >
          Resend confirmation email
        </button>
      </div>
    `;
    
    // Add event listener for resend button
    const resendBtn = document.getElementById("resendConfirmationBtn");
    if (resendBtn) {
      resendBtn.addEventListener("click", handleResendConfirmation);
    }
  }
}

async function handleResendConfirmation() {
  const button = document.getElementById("resendConfirmationBtn");
  const originalText = button.textContent;
  
  try {
    button.disabled = true;
    button.textContent = "Sending...";
    
    const response = await fetch("/api/auth/resend-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccess(data.message);
      button.textContent = "Email sent!";
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
      }, 3000);
    } else {
      showError(data.error || "Failed to send confirmation email");
      resetSubmitButton(button, originalText);
    }
  } catch (error) {
    logger.error("Error resending confirmation:", error);
    showError("Network error. Please try again.");
    resetSubmitButton(button, originalText);
  }
}