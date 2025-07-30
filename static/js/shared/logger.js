/**
 * Environment-aware logging utility for frontend
 * Logs based on server-provided log level configuration
 */
class Logger {
  constructor() {
    // Initialize with defaults, will be updated when environment is available
    this.isInitialized = false;
    this.logLevel = 'debug';
    this.env = 'development';
    this.isProd = false;
    
    // Set up log level hierarchy
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4
    };
    
    this.currentLogLevel = this.logLevels.debug;
    
    // Try to initialize immediately
    this.initializeLogger();
    
    // Also initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeLogger());
    }
  }

  initializeLogger() {
    // Get log level from server-provided configuration
    if (typeof window !== 'undefined' && window.LOG_LEVEL) {
      this.logLevel = window.LOG_LEVEL || 'debug';
      this.env = window.ENV || 'development';
      this.isProd = this.env === 'production';
      this.currentLogLevel = this.logLevels[this.logLevel] || this.logLevels.debug;
      this.isInitialized = true;
    } else {
      // Fallback to defaults if environment variables aren't available yet
      this.logLevel = 'debug';
      this.env = 'development';
      this.isProd = false;
      this.currentLogLevel = this.logLevels.debug;
    }
  }

  /**
   * Check if a log level should be output
   * @param {string} level - The log level to check
   * @returns {boolean} true if should log, false otherwise
   */
  shouldLog(level) {
    const levelValue = this.logLevels[level] || this.logLevels.debug;
    return levelValue >= this.currentLogLevel;
  }

  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Log info messages
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this.shouldLog('info')) {
      console.log('[INFO]', ...args);
    }
  }

  /**
   * Log warning messages
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Log messages (same as debug)
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.shouldLog('debug')) {
      console.log(...args);
    }
  }
}

// Create a singleton instance and make it available globally immediately
(function() {
  'use strict';
  
  const loggerInstance = new Logger();
  
  // Make available globally in all contexts
  if (typeof window !== 'undefined') {
    window.logger = loggerInstance;
  }
  
  if (typeof global !== 'undefined') {
    global.logger = loggerInstance;
  }
  
  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = loggerInstance;
  }
  
  // Return the instance
  return loggerInstance;
})();