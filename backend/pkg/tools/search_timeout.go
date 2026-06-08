package tools

import (
	"time"

	"pentagi/pkg/config"
)

const defaultConfigHTTPClientTimeoutSeconds = 600

func searchToolHTTPTimeout(cfg *config.Config, toolDefault time.Duration) time.Duration {
	if cfg == nil {
		return toolDefault
	}

	if cfg.QuickScanToolConfig && cfg.HTTPClientTimeout > 0 {
		return time.Duration(cfg.HTTPClientTimeout) * time.Second
	}

	switch {
	case cfg.HTTPClientTimeout == defaultConfigHTTPClientTimeoutSeconds:
		return toolDefault
	case cfg.HTTPClientTimeout <= 0:
		return 0
	default:
		return time.Duration(cfg.HTTPClientTimeout) * time.Second
	}
}
