package controller

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/subscriptions"

	"github.com/sirupsen/logrus"
)

var ErrFlowStarting = errors.New("flow startup in progress")

type pendingFlowWorker struct {
	mx         sync.RWMutex
	flow       database.Flow
	db         database.Querier
	publisher  subscriptions.FlowPublisher
	cancel     context.CancelFunc
	completed  bool
	inner      FlowWorker
	startupErr error
}

func newPendingFlowWorker(
	flow database.Flow,
	db database.Querier,
	publisher subscriptions.FlowPublisher,
	cancel context.CancelFunc,
) *pendingFlowWorker {
	return &pendingFlowWorker{
		flow:      flow,
		db:        db,
		publisher: publisher,
		cancel:    cancel,
	}
}

func (fw *pendingFlowWorker) setReady(inner FlowWorker) {
	fw.mx.Lock()
	defer fw.mx.Unlock()

	if fw.completed {
		return
	}

	fw.inner = inner
	fw.completed = true
}

func (fw *pendingFlowWorker) setStartupError(ctx context.Context, err error) {
	fw.mx.Lock()
	if fw.completed {
		fw.mx.Unlock()
		return
	}
	fw.startupErr = err
	fw.completed = true
	fw.mx.Unlock()

	if err == nil || errors.Is(err, context.Canceled) {
		return
	}

	if setErr := fw.SetStatus(ctx, database.FlowStatusFailed); setErr != nil {
		logrus.WithContext(ctx).WithError(setErr).Warnf("failed to mark flow %d startup failure", fw.flow.ID)
	}
}

func (fw *pendingFlowWorker) readyWorker() (FlowWorker, error) {
	fw.mx.RLock()
	defer fw.mx.RUnlock()

	if fw.inner != nil {
		return fw.inner, nil
	}
	if fw.startupErr != nil {
		return nil, fmt.Errorf("flow %d startup failed: %w", fw.flow.ID, fw.startupErr)
	}

	return nil, ErrFlowStarting
}

func (fw *pendingFlowWorker) GetFlowID() int64 {
	return fw.flow.ID
}

func (fw *pendingFlowWorker) GetUserID() int64 {
	return fw.flow.UserID
}

func (fw *pendingFlowWorker) GetTitle() string {
	if inner, err := fw.readyWorker(); err == nil {
		return inner.GetTitle()
	}

	fw.mx.RLock()
	defer fw.mx.RUnlock()
	return fw.flow.Title
}

func (fw *pendingFlowWorker) GetContext() *FlowContext {
	inner, err := fw.readyWorker()
	if err != nil {
		return nil
	}

	return inner.GetContext()
}

func (fw *pendingFlowWorker) GetStatus(ctx context.Context) (database.FlowStatus, error) {
	flow, err := fw.db.GetUserFlow(ctx, database.GetUserFlowParams{
		UserID: fw.flow.UserID,
		ID:     fw.flow.ID,
	})
	if err != nil {
		return database.FlowStatusFailed, fmt.Errorf("failed to get flow %d status: %w", fw.flow.ID, err)
	}

	return flow.Status, nil
}

func (fw *pendingFlowWorker) SetStatus(ctx context.Context, status database.FlowStatus) error {
	flow, err := fw.db.UpdateFlowStatus(ctx, database.UpdateFlowStatusParams{
		Status: status,
		ID:     fw.flow.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to set flow %d status: %w", fw.flow.ID, err)
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
