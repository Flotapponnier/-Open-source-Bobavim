package version

import (
	"fmt"
	"time"
)

// BuildTime will be set at build time using ldflags
var BuildTime string

// GetCacheBuster returns a version string for cache busting
func GetCacheBuster() string {
	if BuildTime != "" {
		return BuildTime
	}
	// Fallback to current time if BuildTime not set
	return fmt.Sprintf("%d", time.Now().Unix())
}