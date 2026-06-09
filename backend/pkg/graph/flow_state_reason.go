package graph

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
)

func (r *flowResolver) getAssistantLogsForStateReason(
	ctx context.Context,
	flowID int64,
	tasks []database.Task,
	assistants []database.Assistant,
) (map[int64][]database.Assistantlog, error) {
	if len(tasks) > 0 || len(assistants) == 0 {
		return nil, nil
	}

	assistantLogs := make(map[int64][]database.Assistantlog, len(assistants))
	for _, assistant := range assistants {
		logs, err := r.DB.GetFlowAssistantLogs(ctx, database.GetFlowAssistantLogsParams{
			AssistantID: assistant.ID,
			FlowID:      flowID,
		})
		if err != nil {
			return nil, fmt.Errorf("get assistant logs for state reason: %w", err)
		}

		assistantLogs[assistant.ID] = logs
	}

	return assistantLogs, nil
}

func deriveFlowStateReason(
	flowStatus model.StatusType,
	tasks []database.Task,
	assistants []database.Assistant,
	assistantLogs map[int64][]database.Assistantlog,
) model.FlowStateReason {
	if flowStatus == model.StatusTypeFinished || flowStatus == model.StatusTypeFailed {
		return model.FlowStateReasonNone
	}

	for _, task := range tasks {
		if task.Status == database.TaskStatusRunning {
			return model.FlowStateReasonTaskRunning
		}
	}

	if len(tasks) > 0 && flowStatus == model.StatusTypeWaiting {
		return model.FlowStateReasonAutomationWaitingForInput
	}

	for _, assistant := range assistants {
		if assistant.Status == database.AssistantStatusRunning {
			return model.FlowStateReasonAssistantRunning
		}
	}

	if len(tasks) == 0 && len(assistants) > 0 {
		if hasAssistantResponse(assistantLogs) {
			return model.FlowStateReasonAssistantIdleAfterResponse
		}

		return model.FlowStateReasonNoTasksForAssistantFlow
	}

	return model.FlowStateReasonNone
}

func hasAssistantResponse(assistantLogs map[int64][]database.Assistantlog) bool {
	for _, logs := range assistantLogs {
		if slices.ContainsFunc(logs, isAssistantResponseLog) {
			return true
		}
	}

	return false
}

func isAssistantResponseLog(log database.Assistantlog) bool {
	switch log.Type {
	case database.MsglogTypeAnswer, database.MsglogTypeReport, database.MsglogTypeDone:
		return strings.TrimSpace(log.Message) != "" || strings.TrimSpace(log.Result) != ""
	default:
		return false
	}
}
