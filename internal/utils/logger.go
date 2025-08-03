package utils

import (
	"log"
	"os"
	"strings"
)

// Compile-time log level constants for zero-cost logging
const (
	LogLevelDebug  = 0
	LogLevelInfo   = 1
	LogLevelWarn   = 2
	LogLevelError  = 3
	LogLevelSilent = 4
)

// Logger configuration variables - set at init time
var (
	isProd       bool
	currentLevel int
)

// Initialize logger configuration once at startup
func init() {
	isProd = os.Getenv("ENV") == "production"
	logLevel := strings.ToLower(os.Getenv("LOG_LEVEL"))
	
	// Set compile-time optimized log level
	switch logLevel {
	case "debug":
		currentLevel = LogLevelDebug
	case "info":
		currentLevel = LogLevelInfo
	case "warn":
		currentLevel = LogLevelWarn
	case "error":
		currentLevel = LogLevelError
	case "silent":
		currentLevel = LogLevelSilent
	default:
		if isProd {
			currentLevel = LogLevelError
		} else {
			currentLevel = LogLevelDebug
		}
	}
}

// Optimized logging functions with compile-time constant checks
func Debug(msg string, args ...interface{}) {
	if currentLevel <= LogLevelDebug {
		log.Printf("[DEBUG] "+msg, args...)
	}
}

func Info(msg string, args ...interface{}) {
	if currentLevel <= LogLevelInfo {
		log.Printf("[INFO] "+msg, args...)
	}
}

func Warn(msg string, args ...interface{}) {
	if currentLevel <= LogLevelWarn {
		log.Printf("[WARN] "+msg, args...)
	}
}

func Error(msg string, args ...interface{}) {
	if currentLevel <= LogLevelError {
		log.Printf("[ERROR] "+msg, args...)
	}
}

// Fatal logs a message and exits (always active)
func Fatal(msg string, args ...interface{}) {
	log.Fatalf("[FATAL] "+msg, args...)
}

// Utility functions
func IsProd() bool {
	return isProd
}

func GetLogLevel() int {
	return currentLevel
}