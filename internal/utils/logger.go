package utils

import (
	"log"
	"os"
	"strings"
)

// Logger configuration variables
var (
	isProd   bool
	logLevel string
)

// Log level constants
const (
	LogLevelDebug = "debug"
	LogLevelInfo  = "info"
	LogLevelWarn  = "warn"
	LogLevelError = "error"
	LogLevelSilent = "silent"
)

// Initialize logger configuration
func init() {
	isProd = os.Getenv("ENV") == "production"
	logLevel = strings.ToLower(os.Getenv("LOG_LEVEL"))
	if logLevel == "" {
		if isProd {
			logLevel = LogLevelError
		} else {
			logLevel = LogLevelDebug
		}
	}
}

// shouldLog determines if a message should be logged based on the current log level
func shouldLog(level string) bool {
	levels := map[string]int{
		LogLevelDebug:  0,
		LogLevelInfo:   1,
		LogLevelWarn:   2,
		LogLevelError:  3,
		LogLevelSilent: 4,
	}
	
	currentLevel, exists := levels[logLevel]
	if !exists {
		currentLevel = levels[LogLevelDebug]
	}
	
	targetLevel, exists := levels[level]
	if !exists {
		targetLevel = levels[LogLevelDebug]
	}
	
	return targetLevel >= currentLevel
}

// Debug logs a debug message
func Debug(msg string, args ...interface{}) {
	if shouldLog(LogLevelDebug) {
		log.Printf("[DEBUG] "+msg, args...)
	}
}

// Info logs an info message
func Info(msg string, args ...interface{}) {
	if shouldLog(LogLevelInfo) {
		log.Printf("[INFO] "+msg, args...)
	}
}

// Warn logs a warning message
func Warn(msg string, args ...interface{}) {
	if shouldLog(LogLevelWarn) {
		log.Printf("[WARN] "+msg, args...)
	}
}

// Error logs an error message
func Error(msg string, args ...interface{}) {
	if shouldLog(LogLevelError) {
		log.Printf("[ERROR] "+msg, args...)
	}
}

// Fatal logs a message and exits (always active)
func Fatal(msg string, args ...interface{}) {
	log.Fatalf("[FATAL] "+msg, args...)
}

// IsProd returns true if running in production mode
func IsProd() bool {
	return isProd
}

// GetLogLevel returns the current log level
func GetLogLevel() string {
	return logLevel
}