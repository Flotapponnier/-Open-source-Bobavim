package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port          string
	DatabaseURL   string
	SessionSecret string
	PearlPoints   int
	TargetScore   int
	MaxGameTime   time.Duration
	MoveCooldown  time.Duration
	IsDevelopment bool
	BaseURL       string
	LogLevel      string
	FrontendLogLevel string
	AdminUsername string
	AdminPassword string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "boba_vim.db"),
		SessionSecret: getEnv("SESSION_SECRET", "your-secret-key-change-in-production"),
		PearlPoints:   getEnvInt("PEARL_POINTS", 100),
		TargetScore:   getEnvInt("TARGET_SCORE", 500),
		MaxGameTime:   time.Duration(getEnvInt("MAX_GAME_TIME", 480)) * time.Second,     // 8 minutes
		MoveCooldown:  time.Duration(getEnvInt("MOVE_COOLDOWN", 100)) * time.Millisecond, // 100ms cooldown
		IsDevelopment: getEnv("ENV", "development") == "development",
		BaseURL:       getEnv("BASE_URL", "http://localhost:8080"),
		LogLevel:      getEnv("LOG_LEVEL", "debug"),
		FrontendLogLevel: getEnv("FRONTEND_LOG_LEVEL", "debug"),
		AdminUsername: getEnv("ADMIN_USERNAME", "test"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "test"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
