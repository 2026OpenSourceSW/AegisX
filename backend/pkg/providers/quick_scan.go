package providers

import (
	"context"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/tools"
)

func quickScanPromptContext(profile tools.QuickScanProfile) map[string]any {
	return map[string]any{
		"QuickScanEnabled":                  profile.Enabled,
		"QuickScanMarker":                   profile.Marker,
		"QuickScanBudgetMinutes":            profile.BudgetMinutes,
		"QuickScanMaxSubtasks":              profile.MaxSubtasks,
		"QuickScanMaxGeneralAgentToolCalls": profile.MaxGeneralAgentToolCalls,
		"QuickScanMaxLimitedAgentToolCalls": profile.MaxLimitedAgentToolCalls,
		"QuickScanDisablePostExploit":       profile.DisablePostExploit,
		"QuickScanRules":                    profile.Rules,
	}
}

func mergeQuickScanPromptContext(target map[string]any, profile tools.QuickScanProfile) {
	for key, value := range quickScanPromptContext(profile) {
		target[key] = value
	}
}

func (fp *flowProvider) mergeQuickScanPromptContextForTask(
	ctx context.Context,
	taskID *int64,
	target map[string]any,
) {
	mergeQuickScanPromptContext(target, fp.quickScanProfileForTask(ctx, taskID))
}

func maxSubtasksForQuickScanProfile(profile tools.QuickScanProfile, defaultLimit int) int {
	if !profile.Enabled || profile.MaxSubtasks <= 0 {
		return defaultLimit
	}
	return min(defaultLimit, profile.MaxSubtasks)
}

func maxAgentCallsForQuickScanProfile(
	profile tools.QuickScanProfile,
	optAgentType pconfig.ProviderOptionsType,
	defaultLimit int,
) int {
	if !profile.Enabled {
		return defaultLimit
	}

	switch optAgentType {
	case pconfig.OptionsTypeAssistant, pconfig.OptionsTypePrimaryAgent,
		pconfig.OptionsTypePentester, pconfig.OptionsTypeCoder, pconfig.OptionsTypeInstaller:
		if profile.MaxGeneralAgentToolCalls > 0 {
			return max(profile.MaxGeneralAgentToolCalls, maxAgentShutdownIterations*2)
		}
	default:
		if profile.MaxLimitedAgentToolCalls > 0 {
			return max(profile.MaxLimitedAgentToolCalls, maxAgentShutdownIterations*2)
		}
	}

	return defaultLimit
}

func shouldPlanAgentTaskForQuickScanProfile(planning bool, profile tools.QuickScanProfile) bool {
	return planning && !(profile.Enabled && profile.DisableAgentPlanner)
}

func (fp *flowProvider) quickScanProfileForTask(ctx context.Context, taskID *int64) tools.QuickScanProfile {
	if taskID == nil || fp.db == nil {
		return tools.QuickScanProfile{}
	}

	task, err := fp.db.GetTask(ctx, *taskID)
	if err != nil {
		return tools.QuickScanProfile{}
	}

	return tools.QuickScanProfileForTaskInput(fp.cfg, task.Input)
}

func (fp *flowProvider) maxSubtasksForTask(ctx context.Context, taskID int64, defaultLimit int) int {
	return maxSubtasksForQuickScanProfile(fp.quickScanProfileForTask(ctx, &taskID), defaultLimit)
}

func (fp *flowProvider) remainingSubtasksForTask(
	ctx context.Context,
	taskID int64,
	defaultLimit int,
	completed []database.Subtask,
) int {
	return max(fp.maxSubtasksForTask(ctx, taskID, defaultLimit)-len(completed), 0)
}

func (fp *flowProvider) maxAgentCallsForTask(
	ctx context.Context,
	optAgentType pconfig.ProviderOptionsType,
	taskID *int64,
	defaultLimit int,
) int {
	return maxAgentCallsForQuickScanProfile(fp.quickScanProfileForTask(ctx, taskID), optAgentType, defaultLimit)
}

func (fp *flowProvider) shouldPlanAgentTask(ctx context.Context, taskID *int64) bool {
	return shouldPlanAgentTaskForQuickScanProfile(fp.planning, fp.quickScanProfileForTask(ctx, taskID))
}
