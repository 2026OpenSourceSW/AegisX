package graph

import (
	"testing"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"

	"github.com/stretchr/testify/assert"
)

func TestDeriveFlowStateReasonWhenAutomationHasRunningTask(t *testing.T) {
	t.Parallel()

	tasks := []database.Task{{Status: database.TaskStatusRunning}}

	reason := deriveFlowStateReason(model.StatusTypeWaiting, tasks, nil, nil)

	assert.Equal(t, model.FlowStateReasonTaskRunning, reason)
}

func TestDeriveFlowStateReasonWhenAutomationWaitsForInput(t *testing.T) {
	t.Parallel()

	tasks := []database.Task{{Status: database.TaskStatusWaiting}}

	reason := deriveFlowStateReason(model.StatusTypeWaiting, tasks, nil, nil)

	assert.Equal(t, model.FlowStateReasonAutomationWaitingForInput, reason)
}

func TestDeriveFlowStateReasonWhenAssistantAnsweredAndWaits(t *testing.T) {
	t.Parallel()

	assistants := []database.Assistant{{ID: 11, Status: database.AssistantStatusWaiting}}
	assistantLogs := map[int64][]database.Assistantlog{
		11: {
			{Type: database.MsglogTypeAnswer, Message: "요약 보고서"},
		},
	}

	reason := deriveFlowStateReason(model.StatusTypeWaiting, nil, assistants, assistantLogs)

	assert.Equal(t, model.FlowStateReasonAssistantIdleAfterResponse, reason)
}

func TestDeriveFlowStateReasonWhenAssistantHasNoTaskRowsYet(t *testing.T) {
	t.Parallel()

	assistants := []database.Assistant{{ID: 12, Status: database.AssistantStatusWaiting}}

	reason := deriveFlowStateReason(model.StatusTypeWaiting, nil, assistants, nil)

	assert.Equal(t, model.FlowStateReasonNoTasksForAssistantFlow, reason)
}

func TestDeriveFlowStateReasonWhenAssistantIsRunning(t *testing.T) {
	t.Parallel()

	assistants := []database.Assistant{{ID: 13, Status: database.AssistantStatusRunning}}

	reason := deriveFlowStateReason(model.StatusTypeWaiting, nil, assistants, nil)

	assert.Equal(t, model.FlowStateReasonAssistantRunning, reason)
}
