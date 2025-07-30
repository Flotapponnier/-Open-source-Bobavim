package signal

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// WaitForShutdown sets up signal handling and gracefully shuts down the server
func WaitForShutdown(srv *http.Server) {
	quit := make(chan os.Signal, 1)
	// Catch more signals including terminal closure
	signal.Notify(quit,
		syscall.SIGINT,  // Ctrl+C
		syscall.SIGTERM, // kill command
		syscall.SIGHUP,  // Terminal hangup (closing terminal)
		syscall.SIGQUIT, // Ctrl+\
	)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
