package tools

import (
	"time"

	"pentagi/pkg/config"
)

func browserToolTimeout(cfg *config.Config) time.Duration {
	return searchToolHTTPTimeout(cfg, browserScraperTimeout)
}
