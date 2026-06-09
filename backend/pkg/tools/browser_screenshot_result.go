package tools

import (
	"context"
	"fmt"

	"github.com/sirupsen/logrus"
)

func (b *browser) appendScreenshotStatus(ctx context.Context, result, url, screen string) string {
	if screen == "" {
		logrus.WithContext(ctx).WithFields(enrichLogrusFields(b.flowID, b.taskID, b.subtaskID, logrus.Fields{
			"tool": BrowserToolName,
			"url":  url,
		})).Warn("browser tool returned content without screenshot")

		return fmt.Sprintf("%s\n\n[screenshot capture warning: no screenshot image was returned by the scraper]", result)
	}

	if b.scp == nil {
		logrus.WithContext(ctx).WithFields(enrichLogrusFields(b.flowID, b.taskID, b.subtaskID, logrus.Fields{
			"tool":       BrowserToolName,
			"url":        url,
			"screenshot": screen,
		})).Warn("browser tool cannot persist screenshot because screenshot provider is unavailable")

		return fmt.Sprintf("%s\n\n[screenshot capture warning: screenshot provider is unavailable]", result)
	}

	if _, err := b.scp.PutScreenshot(ctx, screen, url, b.taskID, b.subtaskID); err != nil {
		logrus.WithContext(ctx).WithError(err).WithFields(enrichLogrusFields(b.flowID, b.taskID, b.subtaskID, logrus.Fields{
			"tool":       BrowserToolName,
			"url":        url,
			"screenshot": screen,
		})).Warn("browser tool failed to persist screenshot")

		return fmt.Sprintf("%s\n\n[screenshot capture warning: failed to save screenshot: %v]", result, err)
	}

	return result
}
