package controller

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"testing"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/docker"
	"pentagi/pkg/graph/subscriptions"
	"pentagi/pkg/graphiti"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/templates"
	"pentagi/pkg/tools"

	"github.com/stretchr/testify/require"
)

func TestFlowController_CreateFlow_returnsBeforeProviderStartupCompletes(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithTimeout(t.Context(), 500*time.Millisecond)
	defer cancel()
	db := newCreateFlowDB()
	provs := &blockingProviderController{
		started: make(chan struct{}),
	}
	fc := NewFlowController(
		db,
		&config.Config{AskUser: false, DataDir: t.TempDir()},
		&flowStartDockerClient{},
		provs,
		subscriptions.NewSubscriptionsController(),
	)
	done := make(chan createFlowResult, 1)

	go func() {
		fw, err := fc.CreateFlow(ctx, 7, "<빠른 점검>\n승인된 보안 점검 대상: localhost", "deepseek", "deepseek", nil, nil)
		done <- createFlowResult{fw: fw, err: err}
	}()

	var result createFlowResult
	select {
	case got := <-done:
		require.NoError(t, got.err)
		require.NotNil(t, got.fw)
		require.Equal(t, int64(101), got.fw.GetFlowID())
		result = got
	case <-time.After(75 * time.Millisecond):
		t.Fatal("CreateFlow waited for provider startup before returning a flow id")
	}

	select {
	case <-provs.started:
		_, err := fc.GetFlow(t.Context(), 101)
		require.NoError(t, err)
		require.NoError(t, result.fw.Finish(t.Context()))
	case <-time.After(2 * time.Second):
		t.Fatal("CreateFlow returned but background startup did not reach provider setup")
	}
}

type createFlowResult struct {
	fw  FlowWorker
	err error
}

type createFlowDB struct {
	database.Querier

	mx   sync.Mutex
	flow database.Flow
}

func newCreateFlowDB() *createFlowDB {
	now := time.Now()
	return &createFlowDB{
		flow: database.Flow{
			ID:                101,
			Title:             "untitled",
			Status:            database.FlowStatusCreated,
			Model:             "unknown",
			ModelProviderName: "deepseek",
			ModelProviderType: database.ProviderTypeDeepseek,
			Language:          "English",
			UserID:            7,
			CreatedAt:         sql.NullTime{Time: now, Valid: true},
			UpdatedAt:         sql.NullTime{Time: now, Valid: true},
		},
	}
}

func (db *createFlowDB) CreateFlow(ctx context.Context, params database.CreateFlowParams) (database.Flow, error) {
	db.mx.Lock()
	defer db.mx.Unlock()

	db.flow.Title = params.Title
	db.flow.Status = params.Status
	db.flow.Model = params.Model
	db.flow.ModelProviderName = params.ModelProviderName
	db.flow.ModelProviderType = params.ModelProviderType
	db.flow.Language = params.Language
	db.flow.UserID = params.UserID
	db.flow.Functions = params.Functions
	return db.flow, nil
}

func (db *createFlowDB) GetUser(ctx context.Context, userID int64) (database.GetUserRow, error) {
	return database.GetUserRow{
		ID:       userID,
		Mail:     "admin@pentagi.com",
		Name:     "Admin",
		Hash:     "admin",
		RoleName: "admin",
	}, nil
}

func (db *createFlowDB) GetUserPrompts(ctx context.Context, userID int64) ([]database.Prompt, error) {
	return nil, nil
}

func (db *createFlowDB) UpdateFlowStatus(ctx context.Context, params database.UpdateFlowStatusParams) (database.Flow, error) {
	db.mx.Lock()
	defer db.mx.Unlock()

	db.flow.Status = params.Status
	return db.flow, nil
}

func (db *createFlowDB) UpdateFlowTitle(ctx context.Context, params database.UpdateFlowTitleParams) (database.Flow, error) {
	db.mx.Lock()
	defer db.mx.Unlock()

	db.flow.Title = params.Title
	return db.flow, nil
}

func (db *createFlowDB) GetFlow(ctx context.Context, flowID int64) (database.Flow, error) {
	db.mx.Lock()
	defer db.mx.Unlock()

	if flowID != db.flow.ID {
		return database.Flow{}, fmt.Errorf("flow %d not found", flowID)
	}
	return db.flow, nil
}

func (db *createFlowDB) GetFlowContainers(ctx context.Context, flowID int64) ([]database.Container, error) {
	return nil, nil
}

type blockingProviderController struct {
	providers.ProviderController

	once    sync.Once
	started chan struct{}
}

func (pc *blockingProviderController) NewFlowProvider(
	ctx context.Context,
	prvname provider.ProviderName,
	prompter templates.Prompter,
	executor tools.FlowToolsExecutor,
	flowID, userID int64,
	askUser bool,
	input string,
) (providers.FlowProvider, error) {
	pc.once.Do(func() {
		close(pc.started)
	})
	<-ctx.Done()
	return nil, ctx.Err()
}

func (pc *blockingProviderController) GraphitiClient() *graphiti.Client {
	return nil
}

type flowStartDockerClient struct {
	docker.DockerClient
}

func (dc *flowStartDockerClient) GetDefaultImage() string {
	return "vxcontrol/kali-linux"
}
