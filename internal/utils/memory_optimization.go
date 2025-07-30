package utils

import (
	"runtime"
	"runtime/debug"
	"time"
)

// OptimizeMemorySettings configures Go runtime for high-performance gaming
func OptimizeMemorySettings() {
	// Set GOGC to a higher value for better performance under high load
	// This reduces garbage collection frequency at the cost of more memory usage
	debug.SetGCPercent(200)
	
	// Set memory limit to prevent excessive memory usage
	// This should be adjusted based on your server's available memory
	debug.SetMemoryLimit(8 << 30) // 8GB limit
	
	// Configure soft memory limit for gradual cleanup
	debug.SetMemoryLimit(6 << 30) // 6GB soft limit
}

// PeriodicMemoryCleanup runs periodic memory cleanup for long-running servers
func PeriodicMemoryCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			// Force garbage collection periodically
			runtime.GC()
			
			// Return memory to OS
			debug.FreeOSMemory()
		}
	}()
}

// GetMemoryStats returns current memory usage statistics
func GetMemoryStats() runtime.MemStats {
	var stats runtime.MemStats
	runtime.ReadMemStats(&stats)
	return stats
}

// ForceGarbageCollection manually triggers garbage collection
func ForceGarbageCollection() {
	runtime.GC()
	debug.FreeOSMemory()
}

// ConfigureForMultiplayer optimizes memory settings specifically for multiplayer gaming
func ConfigureForMultiplayer() {
	// Set maximum number of OS threads
	runtime.GOMAXPROCS(runtime.NumCPU())
	
	// Configure garbage collector for low latency
	debug.SetGCPercent(150)
	
	// Set memory limit for multiplayer scenarios
	debug.SetMemoryLimit(12 << 30) // 12GB for multiplayer
}