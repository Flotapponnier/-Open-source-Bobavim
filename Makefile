# 🧋 Boba.vim Open Source Makefile
# Simple build and development automation

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help install dev build test lint clean setup

# Default target
help: ## Show this help message
	@echo "🧋 Boba.vim Open Source - Development Commands"
	@echo "=============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

# Setup Commands
setup: ## Initial setup - copy .env.example to .env
	@echo "$(YELLOW)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✅ Created .env file from .env.example$(NC)"; \
		echo "$(YELLOW)📝 Edit .env file if you need to customize settings$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  .env file already exists$(NC)"; \
	fi
	@$(MAKE) install

install: ## Install Go dependencies
	@echo "$(YELLOW)Installing Go dependencies...$(NC)"
	go mod download
	go mod verify
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

# Development Commands
dev: ## Start local development server
	@echo "$(YELLOW)Starting Boba.vim development server...$(NC)"
	@echo "$(GREEN)🚀 Server will be available at http://localhost:8080$(NC)"
	@echo "$(GREEN)🔐 Admin panel: http://localhost:8080/admin (test/test)$(NC)"
	go run main.go

build: ## Build the application
	@echo "$(YELLOW)Building Boba.vim...$(NC)"
	go build -o boba-vim main.go
	@echo "$(GREEN)✅ Build completed: ./boba-vim$(NC)"

run: build ## Build and run the application
	@echo "$(YELLOW)Running Boba.vim...$(NC)"
	@echo "$(GREEN)🚀 Server available at http://localhost:8080$(NC)"
	@echo "$(GREEN)🔐 Admin panel: http://localhost:8080/admin (test/test)$(NC)"
	./boba-vim

# Testing and Quality
test: ## Run tests
	@echo "$(YELLOW)Running tests...$(NC)"
	go test -v ./...
	@echo "$(GREEN)✅ Tests completed$(NC)"

lint: ## Run linting
	@echo "$(YELLOW)Running linter...$(NC)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "$(RED)golangci-lint not installed. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest$(NC)"; \
		go vet ./...; \
		go fmt ./...; \
	fi
	@echo "$(GREEN)✅ Linting completed$(NC)"

# Cleanup
clean: ## Clean build artifacts and databases
	@echo "$(YELLOW)Cleaning up...$(NC)"
	@rm -f boba-vim
	@rm -f *.db
	@rm -f main
	@echo "$(GREEN)✅ Cleanup completed$(NC)"

# Database
clean-db: ## Clean database (remove local SQLite files)
	@echo "$(YELLOW)Removing local databases...$(NC)"
	@rm -f *.db
	@echo "$(GREEN)✅ Databases removed$(NC)"

# Development helpers
fmt: ## Format Go code
	@echo "$(YELLOW)Formatting Go code...$(NC)"
	go fmt ./...
	@echo "$(GREEN)✅ Code formatted$(NC)"

tidy: ## Tidy Go modules
	@echo "$(YELLOW)Tidying Go modules...$(NC)"
	go mod tidy
	@echo "$(GREEN)✅ Modules tidied$(NC)"

# Quick start
start: setup dev ## Quick start - setup and run development server