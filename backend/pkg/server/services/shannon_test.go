package services

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"pentagi/pkg/config"
	"pentagi/pkg/server/response"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const shannonServiceStderrSecret = "TOKEN_SECRET_DO_NOT_LEAK_123"

func TestRunFlowShannonScanDoesNotExposeRawSecretStderr(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	createShannonFlowTable(t, db)

	workspace := t.TempDir()
	command := writeFailingShannonServiceCommand(t, workspace)
	service := NewShannonService(db, &config.Config{
		ShannonEnabled:      true,
		ShannonWorkspaceDir: workspace,
		ShannonCommand:      command,
		ShannonTimeout:      1,
	}, nil)

	requestBody := bytes.NewBufferString(`{
		"target_url": "https://owned.example.test",
		"owned_target_confirmed": true,
		"non_production_confirmed": true
	}`)
	c, w := setupTestContext(1, 2, "testhash1", []string{"flows.edit"})
	c.Params = gin.Params{{Key: "flowID", Value: "1"}}
	c.Request = httptest.NewRequest(http.MethodPost, "/flows/1/shannon/scan", requestBody)

	service.RunFlowShannonScan(c)

	body := w.Body.String()
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, body, response.ErrShannonRunFailed.Code())
	assert.NotContains(t, body, shannonServiceStderrSecret)
}

func createShannonFlowTable(t *testing.T, db *gorm.DB) {
	t.Helper()

	require.NoError(t, db.Exec(`
		CREATE TABLE flows (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			status TEXT,
			title TEXT,
			model TEXT,
			model_provider_name TEXT,
			model_provider_type TEXT,
			language TEXT,
			functions TEXT,
			tool_call_id_template TEXT,
			trace_id TEXT,
			user_id INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			deleted_at DATETIME
		)
	`).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO flows (
			id, status, title, model, model_provider_name, model_provider_type,
			language, functions, tool_call_id_template, trace_id, user_id
		) VALUES (
			1, 'created', 'Shannon test flow', 'test-model', 'test-provider',
			'openai', 'English', '{}', '{{.Tool}}-{{.Index}}', 'trace-test', 1
		)
	`).Error)
}

func writeFailingShannonServiceCommand(t *testing.T, dir string) string {
	t.Helper()

	path := filepath.Join(dir, "fake-shannon-service-fail.sh")
	script := "#!/bin/sh\nprintf '%s\\n' '" + shannonServiceStderrSecret + "' >&2\nexit 1\n"
	require.NoError(t, os.WriteFile(path, []byte(script), 0o755))
	return path
}
