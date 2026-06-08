package graph

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"pentagi/pkg/controller"
	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
	"pentagi/pkg/graph/subscriptions"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMutationResolver_DeleteFlow_allowsAlreadyDeletedFlow(t *testing.T) {
	t.Parallel()

	ctx := SetUserID(t.Context(), 7)
	ctx = SetUserPermissions(ctx, []string{"flows.delete"})
	db := &deleteFlowResolverDB{
		flow: database.Flow{
			ID:        101,
			UserID:    7,
			DeletedAt: sql.NullTime{Time: time.Now(), Valid: true},
		},
	}
	resolver := &Resolver{
		DB:            db,
		Logger:        logrus.NewEntry(logrus.New()),
		Controller:    &deleteFlowResolverController{err: controller.ErrFlowNotFound},
		Subscriptions: subscriptions.NewSubscriptionsController(),
	}

	got, err := resolver.Mutation().DeleteFlow(ctx, 101)
	require.NoError(t, err)
	assert.Equal(t, model.ResultTypeSuccess, got)
	assert.True(t, db.deleted)
}

type deleteFlowResolverDB struct {
	database.Querier

	flow    database.Flow
	deleted bool
}

func (db *deleteFlowResolverDB) GetFlowIncludingDeleted(ctx context.Context, flowID int64) (database.Flow, error) {
	return db.flow, nil
}

func (db *deleteFlowResolverDB) GetFlowContainers(ctx context.Context, flowID int64) ([]database.Container, error) {
	return nil, nil
}

func (db *deleteFlowResolverDB) DeleteFlow(ctx context.Context, flowID int64) (database.Flow, error) {
	db.deleted = true
	return db.flow, nil
}

func (db *deleteFlowResolverDB) DeleteFlowMemoryDocuments(ctx context.Context, flowID sql.NullString) error {
	return nil
}

type deleteFlowResolverController struct {
	controller.FlowController

	err error
}

func (fc *deleteFlowResolverController) FinishFlow(ctx context.Context, flowID int64) error {
	return fc.err
}
