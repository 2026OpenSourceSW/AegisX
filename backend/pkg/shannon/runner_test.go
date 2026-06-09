package shannon

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const failingStderrSecret = "TOKEN_SECRET_DO_NOT_LEAK_123"

func TestSplitCommand(t *testing.T) {
	t.Parallel()

	command, err := splitCommand(`docker run --rm -v "C:\work dir:/workspace" keygraph/shannon`)
	require.NoError(t, err)

	assert.Equal(t, []string{
		"docker",
		"run",
		"--rm",
		"-v",
		`C:\work dir:/workspace`,
		"keygraph/shannon",
	}, command)
}

func TestSplitCommandUnterminatedQuote(t *testing.T) {
	t.Parallel()

	_, err := splitCommand(`shannon --flag "unterminated`)
	require.Error(t, err)
}

func TestRunnerFailureDoesNotExposeRawSecretStderr(t *testing.T) {
	t.Parallel()

	workspace := t.TempDir()
	command := writeFailingShannonCommand(t, workspace)
	runner := NewRunner(Config{
		Enabled:      true,
		WorkspaceDir: workspace,
		Command:      command,
		Timeout:      time.Second,
	})

	_, err := runner.Run(t.Context(), ScanRequest{
		TargetURL:              "https://owned.example.test",
		OwnedTargetConfirmed:   true,
		NonProductionConfirmed: true,
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "shannon command failed")
	assert.NotContains(t, err.Error(), failingStderrSecret)
}

func TestRunnerSuccessKeepsShannonStderrInScanResult(t *testing.T) {
	t.Parallel()

	workspace := t.TempDir()
	command := writeSuccessfulShannonCommand(t, workspace)
	runner := NewRunner(Config{
		Enabled:      true,
		WorkspaceDir: workspace,
		Command:      command,
		Timeout:      time.Second,
	})

	result, err := runner.Run(t.Context(), ScanRequest{
		TargetURL:              "https://owned.example.test",
		OwnedTargetConfirmed:   true,
		NonProductionConfirmed: true,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "diagnostic stderr\n", result.Stderr)
	assert.Contains(t, result.Report.Markdown, "Shannon Report")
}

func writeFailingShannonCommand(t *testing.T, dir string) string {
	t.Helper()

	path := filepath.Join(dir, "fake-shannon-fail.sh")
	script := "#!/bin/sh\nprintf '%s\\n' '" + failingStderrSecret + "' >&2\nexit 1\n"
	require.NoError(t, os.WriteFile(path, []byte(script), 0o755))
	return path
}

func writeSuccessfulShannonCommand(t *testing.T, dir string) string {
	t.Helper()

	path := filepath.Join(dir, "fake-shannon-success.sh")
	script := `#!/bin/sh
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then
    output="$2"
    shift 2
  else
    shift
  fi
done
printf '%s\n' 'diagnostic stderr' >&2
printf '%s\n' '# Shannon Report' '## Findings' '- none' > "$output"
`
	require.NoError(t, os.WriteFile(path, []byte(script), 0o755))
	return path
}
