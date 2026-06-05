package shannon

import (
	"context"
	"fmt"
)

type Job struct {
	runner *Runner
}

func NewJob(runner *Runner) *Job {
	return &Job{runner: runner}
}

func (j *Job) RunScan(ctx context.Context, req ScanRequest) (*ScanResult, error) {
	if j == nil || j.runner == nil {
		return nil, fmt.Errorf("shannon runner is not configured")
	}

	return j.runner.Run(ctx, req)
}
