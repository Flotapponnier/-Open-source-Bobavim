import { AUTH_CONFIG } from "./index_constants/auth.js";

export function initializeForgotPassword() {
  logger.debug("Initializing forgot password functionality...");

  const forgotPasswordForm = document.getElementById(
    AUTH_CONFIG.ELEMENT_IDS.FORGOT_PASSWORD_FORM,
  );

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
  }
}

async function handleForgotPasswordSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const email = formData.get("email");

  if (!email) {
    showForgotPasswordError("Please enter your email address");
    return;
  }

  try {
    const response = await fetch(AUTH_CONFIG.ENDPOINTS.FORGOT_PASSWORD, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      showForgotPasswordSuccess(AUTH_CONFIG.MESSAGES.FORGOT_PASSWORD_SUCCESS);
      // Clear the form
      e.target.reset();
      // Switch back to login form after showing success message
      setTimeout(() => {
        switchToLoginForm();
      }, 3000);
    } else {
      showForgotPasswordError(data.error || "Failed to send reset link");
    }
  } catch (error) {
    logger.error("Forgot password error:", error);
    showForgotPasswordError(AUTH_CONFIG.MESSAGES.NETWORK_ERROR);
  }
}

function showForgotPasswordError(message) {
  const errorDiv = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.AUTH_ERROR);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    errorDiv.style.color = "#ff6b6b";
  }
}

function showForgotPasswordSuccess(message) {
  const errorDiv = document.getElementById(AUTH_CONFIG.ELEMENT_IDS.AUTH_ERROR);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    errorDiv.style.color = "#51cf66";
  }
}

function switchToLoginForm() {
  // Import the auth module to use its switchAuthForm function
  import("./auth.js").then((authModule) => {
    // The switchAuthForm function is not exported, so we'll trigger the switch manually
    const switchToLogin = document.getElementById(
      AUTH_CONFIG.ELEMENT_IDS.SWITCH_TO_LOGIN_FROM_FORGOT,
    );
    if (switchToLogin) {
      switchToLogin.click();
    }
  });
}