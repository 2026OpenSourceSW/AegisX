package tools

import (
	"errors"
	"strings"
	"testing"
)

func TestWrapCommandResult_warnsWhenScreenshotPersistenceFails(t *testing.T) {
	t.Parallel()

	scp := &screenshotProviderMock{returnErr: errors.New("database unavailable")}
	b := &browser{
		flowID: 1,
		scp:    scp,
	}

	result, err := b.wrapCommandResult(
		t.Context(),
		"browser",
		"markdown content",
		"https://example.com",
		"screen.png",
		nil,
	)
	if err != nil {
		t.Fatalf("wrapCommandResult() returned unexpected error: %v", err)
	}
	if !strings.Contains(result, "markdown content") {
		t.Fatalf("wrapCommandResult() = %q, want original content", result)
	}
	if !strings.Contains(result, "screenshot capture warning") {
		t.Fatalf("wrapCommandResult() = %q, want screenshot warning", result)
	}
	if !strings.Contains(result, "database unavailable") {
		t.Fatalf("wrapCommandResult() = %q, want persistence error detail", result)
	}

	scp.mu.Lock()
	defer scp.mu.Unlock()
	if scp.calls != 1 {
		t.Fatalf("PutScreenshot() calls = %d, want 1", scp.calls)
	}
}

func TestWrapCommandResult_warnsWhenScreenshotIsMissing(t *testing.T) {
	t.Parallel()

	scp := &screenshotProviderMock{}
	b := &browser{
		flowID: 1,
		scp:    scp,
	}

	result, err := b.wrapCommandResult(
		t.Context(),
		"browser",
		"markdown content",
		"https://example.com",
		"",
		nil,
	)
	if err != nil {
		t.Fatalf("wrapCommandResult() returned unexpected error: %v", err)
	}
	if !strings.Contains(result, "screenshot capture warning") {
		t.Fatalf("wrapCommandResult() = %q, want missing screenshot warning", result)
	}
	if !strings.Contains(result, "no screenshot image was returned") {
		t.Fatalf("wrapCommandResult() = %q, want empty screenshot reason", result)
	}

	scp.mu.Lock()
	defer scp.mu.Unlock()
	if scp.calls != 0 {
		t.Fatalf("PutScreenshot() calls = %d, want 0", scp.calls)
	}
}
