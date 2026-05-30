package shannon

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
