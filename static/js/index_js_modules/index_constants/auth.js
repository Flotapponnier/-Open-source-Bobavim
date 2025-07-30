// ================================
// AUTHENTICATION CONFIGURATION
// ================================

export const AUTH_CONFIG = {
  ENDPOINTS: {
    ME: "/api/auth/me",
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
  },
  MESSAGES: {
    LOGIN_TITLE: "🔑 Login to Your Account",
    REGISTER_TITLE: "🔒 Register to Unlock Premium Characters",
    FORGOT_PASSWORD_TITLE: "🔓 Reset Your Password",
    REGISTRATION_SUCCESS:
      "Registration successful! Welcome to the boba community! Please confirm your mail to have all the features !",
    FORGOT_PASSWORD_SUCCESS: "📧 Password reset link sent to your email!",
    NETWORK_ERROR: "Network error. Please try again.",
  },
  ELEMENT_IDS: {
    MODAL: "authModal",
    REGISTRATION_FORM: "registrationForm",
    LOGIN_FORM: "loginForm",
    FORGOT_PASSWORD_FORM: "forgotPasswordForm",
    LOGOUT_BUTTON: "logoutButton",
    LOGIN_BUTTON: "loginButton",
    REGISTER_BUTTON: "registerButton",
    SWITCH_TO_LOGIN: "switchToLogin",
    SWITCH_TO_REGISTER: "switchToRegister",
    SWITCH_TO_FORGOT_PASSWORD: "switchToForgotPassword",
    SWITCH_TO_LOGIN_FROM_FORGOT: "switchToLoginFromForgot",
    MODAL_TITLE: "modalTitle",
    USER_PANEL: "userPanel",
    LOGGED_USERNAME: "loggedUsername",
    AUTH_BUTTONS: "authButtons",
    AUTH_ERROR: "authError",
  },
};
