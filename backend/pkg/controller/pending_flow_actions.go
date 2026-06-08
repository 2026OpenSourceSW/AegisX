package controller

import (
	"context"
	"errors"
	"fmt"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/provider"
)

func (fw *pendingFlowWorker) AddAssistant(ctx context.Context, aw AssistantWorker) error {
	inner, err := fw.readyWorker()
	if err != nil {
		return err
	}

	return inner.AddAssistant(ctx, aw)
}

func (fw *pendingFlowWorker) GetAssistant(ctx context.Context, assistantID int64) (AssistantWorker, error) {
	inner, err := fw.readyWorker()
	if err != nil {
		return nil, err
	}

	return inner.GetAssistant(ctx, assistantID)
}

func (fw *pendingFlowWorker) DeleteAssistant(ctx context.Context, assistantID int64) error {
	inner, err := fw.readyWorker()
	if err != nil {
		return err
	}

	return inner.DeleteAssistant(ctx, assistantID)
}

func (fw *pendingFlowWorker) ListAssistants(ctx context.Context) []AssistantWorker {
	inner, err := fw.readyWorker()
	if err != nil {
		return nil
	}

	return inner.ListAssistants(ctx)
}

func (fw *pendingFlowWorker) ListTasks(ctx context.Context) []TaskWorker {
	inner, err := fw.readyWorker()
	if err != nil {
		return nil
	}

	return inner.ListTasks(ctx)
}

func (fw *pendingFlowWorker) PutInput(
	ctx context.Context,
	input string,
	prv provider.Provider,
	resources []database.UserResource,
) error {
	inner, err := fw.readyWorker()
	if err != nil {
		return err
	}

	return inner.PutInput(ctx, input, prv, resources)
}

func (fw *pendingFlowWorker) PutResources(ctx context.Context, resources []database.UserResource) error {
	inner, err := fw.readyWorker()
	if err != nil {
		return err
	}

	return inner.PutResources(ctx, resources)
}

func (fw *pendingFlowWorker) Finish(ctx context.Context) error {
	fw.cancel()

	inner, err := fw.readyWorker()
	if err == nil {
		return inner.Finish(ctx)
	}
	if !errors.Is(err, ErrFlowStarting) {
		return err
	}

	return fw.SetStatus(ctx, database.FlowStatusFinished)
}

func (fw *pendingFlowWorker) Stop(ctx context.Context) error {
	fw.cancel()

	inner, err := fw.readyWorker()
	if err == nil {
		return inner.Stop(ctx)
	}
	if !errors.Is(err, ErrFlowStarting) {
		return err
	}

	return fw.SetStatus(ctx, database.FlowStatusWaiting)
}

func (fw *pendingFlowWorker) Rename(ctx context.Context, title string) error {
	inner, err := fw.readyWorker()
	if err == nil {
		return inner.Rename(ctx, title)
	}
	if !errors.Is(err, ErrFlowStarting) {
		return err
	}

	flow, err := fw.db.UpdateFlowTitle(ctx, database.UpdateFlowTitleParams{
		ID:    fw.flow.ID,
		Title: title,
	})
	if err != nil {
		return fmt.Errorf("failed to rename flow %d: %w", fw.flow.ID, err)
	}

	containers, err := fw.db.GetFlowContainers(ctx, fw.flow.ID)
	if err != nil {
		return fmt.Errorf("failed to get flow %d containers: %w", fw.flow.ID, err)
	}

	fw.mx.Lock()
	fw.flow = flow
	fw.mx.Unlock()
	fw.publisher.FlowUpdated(ctx, flow, containers)

	return nil
}

func (fw *pendingFlowWorker) WaitTaskCompletion(ctx context.Context) error {
	inner, err := fw.readyWorker()
	if err != nil {
		return err
	}

	return inner.WaitTaskCompletion(ctx)
}
