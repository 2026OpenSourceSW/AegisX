package tools

import "time"

func (d *duckduckgo) timeout() time.Duration {
	return searchToolHTTPTimeout(d.cfg, duckduckgoTimeout)
}
