package providers

import (
	"testing"

	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/tools"

	"github.com/stretchr/testify/assert"
)

func TestQuickScanPromptContext(t *testing.T) {
	t.Parallel()

	profile := tools.QuickScanProfile{
		Enabled:                  true,
		Marker:                   tools.QuickScanTaskMarker,
		BudgetMinutes:            "5~10분",
		MaxSubtasks:              1,
		MaxGeneralAgentToolCalls: 8,
		MaxLimitedAgentToolCalls: 6,
		DisablePostExploit:       true,
		Rules:                    []string{"긴 정밀 스캔 금지"},
	}

	context := quickScanPromptContext(profile)

	assert.Equal(t, true, context["QuickScanEnabled"])
	assert.Equal(t, tools.QuickScanTaskMarker, context["QuickScanMarker"])
	assert.Equal(t, "5~10분", context["QuickScanBudgetMinutes"])
	assert.Equal(t, 1, context["QuickScanMaxSubtasks"])
	assert.Equal(t, 8, context["QuickScanMaxGeneralAgentToolCalls"])
	assert.Equal(t, 6, context["QuickScanMaxLimitedAgentToolCalls"])
	assert.Equal(t, true, context["QuickScanDisablePostExploit"])
	assert.Equal(t, []string{"긴 정밀 스캔 금지"}, context["QuickScanRules"])
}

func TestMergeQuickScanPromptContext_preservesExistingFields(t *testing.T) {
	t.Parallel()

	target := map[string]any{
		"Existing": "value",
	}

	mergeQuickScanPromptContext(target, tools.QuickScanProfile{
		Enabled:                  true,
		Marker:                   tools.QuickScanTaskMarker,
		BudgetMinutes:            "5~10분",
		MaxSubtasks:              1,
		MaxGeneralAgentToolCalls: 8,
		MaxLimitedAgentToolCalls: 6,
		DisablePostExploit:       true,
		Rules:                    []string{"긴 정밀 스캔 금지"},
	})

	assert.Equal(t, "value", target["Existing"])
	assert.Equal(t, true, target["QuickScanEnabled"])
	assert.Equal(t, tools.QuickScanTaskMarker, target["QuickScanMarker"])
	assert.Equal(t, 1, target["QuickScanMaxSubtasks"])
}

func TestQuickScanMaxSubtasks(t *testing.T) {
	t.Parallel()

	assert.Equal(t, 1, maxSubtasksForQuickScanProfile(
		tools.QuickScanProfile{Enabled: true, MaxSubtasks: 1},
		TasksNumberLimit,
	))
	assert.Equal(t, TasksNumberLimit, maxSubtasksForQuickScanProfile(
		tools.QuickScanProfile{},
		TasksNumberLimit,
	))
}

func TestQuickScanMaxAgentCalls(t *testing.T) {
	t.Parallel()

	profile := tools.QuickScanProfile{
		Enabled:                  true,
		MaxGeneralAgentToolCalls: 8,
		MaxLimitedAgentToolCalls: 6,
	}

	assert.Equal(t, 8, maxAgentCallsForQuickScanProfile(
		profile,
		pconfig.OptionsTypePentester,
		maxGeneralAgentChainIterations,
	))
	assert.Equal(t, 6, maxAgentCallsForQuickScanProfile(
		profile,
		pconfig.OptionsTypeSearcher,
		maxLimitedAgentChainIterations,
	))
	assert.Equal(t, maxLimitedAgentChainIterations, maxAgentCallsForQuickScanProfile(
		tools.QuickScanProfile{},
		pconfig.OptionsTypeSearcher,
		maxLimitedAgentChainIterations,
	))
}

func TestQuickScanPlannerDecision(t *testing.T) {
	t.Parallel()

	assert.False(t, shouldPlanAgentTaskForQuickScanProfile(
		true,
		tools.QuickScanProfile{Enabled: true, DisableAgentPlanner: true},
	))
	assert.True(t, shouldPlanAgentTaskForQuickScanProfile(
		true,
		tools.QuickScanProfile{Enabled: true, DisableAgentPlanner: false},
	))
	assert.False(t, shouldPlanAgentTaskForQuickScanProfile(
		false,
		tools.QuickScanProfile{Enabled: true, DisableAgentPlanner: false},
	))
}
