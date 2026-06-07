package worker

import (
	"context"

	"pentagi/pkg/config"
	"pentagi/pkg/tools"
)

func (te *toolExecutor) toolConfig(ctx context.Context) *config.Config {
	return tools.ToolConfigForTaskInput(te.cfg, te.taskInput(ctx))
}

func (te *toolExecutor) taskInput(ctx context.Context) string {
	if te.taskID == nil || te.db == nil {
		return ""
	}

	task, err := te.db.GetTask(ctx, *te.taskID)
	if err != nil {
		return ""
	}

	return task.Input
}
