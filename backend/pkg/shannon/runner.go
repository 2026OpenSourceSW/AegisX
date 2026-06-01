package shannon

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type Runner struct {
	cfg Config
}

func NewRunner(cfg Config) *Runner {
	if cfg.Timeout <= 0 {
		cfg.Timeout = time.Hour
	}
	return &Runner{cfg: cfg}
}

func (r *Runner) Run(ctx context.Context, req ScanRequest) (*ScanResult, error) {
	if !r.cfg.Enabled {
		return nil, errors.New("shannon integration is disabled")
	}
	if !req.OwnedTargetConfirmed || !req.NonProductionConfirmed {
		return nil, errors.New("target ownership and non-production confirmations are required")
	}

	workspace, err := r.resolveWorkspace(req.WorkspacePath)
	if err != nil {
		return nil, err
	}

	reportPath := filepath.Join(workspace, fmt.Sprintf("shannon-report-%d.md", time.Now().UTC().UnixNano()))
	command, err := splitCommand(r.cfg.Command)
	if err != nil {
		return nil, err
	}

	args := append(command[1:], "--target", req.TargetURL, "--workspace", workspace, "--output", reportPath)
	runCtx, cancel := context.WithTimeout(ctx, r.cfg.Timeout)
	defer cancel()

	cmd := exec.CommandContext(runCtx, command[0], args...)
	cmd.Dir = workspace

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if runCtx.Err() != nil {
		return nil, fmt.Errorf("shannon command timed out: %w", runCtx.Err())
	}
	if err != nil {
		return nil, fmt.Errorf("shannon command failed: %w: %s", err, stderr.String())
	}

	reportBytes, err := os.ReadFile(reportPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read shannon report: %w", err)
	}

	fullCommand := append([]string{command[0]}, args...)
	return &ScanResult{
		Command:       fullCommand,
		WorkspacePath: workspace,
		ReportPath:    reportPath,
		Stdout:        stdout.String(),
		Stderr:        stderr.String(),
		Report:        ParseMarkdownReport(string(reportBytes)),
	}, nil
}

func (r *Runner) resolveWorkspace(requested string) (string, error) {
	base := strings.TrimSpace(r.cfg.WorkspaceDir)
	if base == "" {
		return "", errors.New("SHANNON_WORKSPACE_DIR is required")
	}

	workspace := strings.TrimSpace(requested)
	if workspace == "" {
		workspace = base
	} else if !filepath.IsAbs(workspace) {
		workspace = filepath.Join(base, workspace)
	}

	baseAbs, err := filepath.Abs(base)
	if err != nil {
		return "", err
	}
	baseReal, err := filepath.EvalSymlinks(baseAbs)
	if err != nil {
		return "", err
	}

	workspaceAbs, err := filepath.Abs(workspace)
	if err != nil {
		return "", err
	}

	if info, err := os.Stat(workspaceAbs); err != nil {
		return "", err
	} else if !info.IsDir() {
		return "", errors.New("workspace path must be a directory")
	}

	workspaceReal, err := filepath.EvalSymlinks(workspaceAbs)
	if err != nil {
		return "", err
	}

	rel, err := filepath.Rel(baseReal, workspaceReal)
	if err != nil {
		return "", err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", errors.New("workspace path must stay inside SHANNON_WORKSPACE_DIR")
	}

	return workspaceReal, nil
}

func splitCommand(raw string) ([]string, error) {
	var (
		fields  []string
		current strings.Builder
		quote   rune
	)

	for _, ch := range strings.TrimSpace(raw) {
		switch {
		case quote != 0:
			if ch == quote {
				quote = 0
			} else {
				current.WriteRune(ch)
			}
		case ch == '"' || ch == '\'':
			quote = ch
		case ch == ' ' || ch == '\t' || ch == '\n':
			if current.Len() > 0 {
				fields = append(fields, current.String())
				current.Reset()
			}
		default:
			current.WriteRune(ch)
		}
	}
	if quote != 0 {
		return nil, errors.New("unterminated quote in SHANNON_COMMAND")
	}
	if current.Len() > 0 {
		fields = append(fields, current.String())
	}
	if len(fields) == 0 {
		return nil, errors.New("SHANNON_COMMAND is required")
	}
	return fields, nil
}
