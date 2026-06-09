package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"pentagi/pkg/cast"
	"pentagi/pkg/database"
	obs "pentagi/pkg/observability"
	"pentagi/pkg/observability/langfuse"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/tools"

	"github.com/sirupsen/logrus"
)

func createFlowRecord(ctx context.Context, fwc newFlowWorkerCtx) (database.Flow, error) {
	flow, err := fwc.db.CreateFlow(ctx, database.CreateFlowParams{
		Title:              "untitled",
		Status:             database.FlowStatusCreated,
		Model:              "unknown",
		ModelProviderName:  fwc.prvname.String(),
		ModelProviderType:  database.ProviderType(fwc.prvtype),
		Language:           "English",
		ToolCallIDTemplate: cast.ToolCallIDTemplate,
		Functions:          []byte("{}"),
		UserID:             fwc.userID,
	})
	if err != nil {
		logrus.WithError(err).Error("failed to create flow in DB")
		return database.Flow{}, fmt.Errorf("failed to create flow in DB: %w", err)
	}

	logrus.WithContext(ctx).WithFields(logrus.Fields{
		"flow_id":       flow.ID,
		"user_id":       fwc.userID,
		"provider_name": fwc.prvname.String(),
		"provider_type": fwc.prvtype.String(),
	}).Info("flow created in DB")

	return flow, nil
}

func startFlowWorker(ctx context.Context, flow database.Flow, fwc newFlowWorkerCtx) (FlowWorker, error) {
	logger := logrus.WithContext(ctx).WithFields(logrus.Fields{
		"flow_id":       flow.ID,
		"user_id":       fwc.userID,
		"provider_name": fwc.prvname.String(),
		"provider_type": fwc.prvtype.String(),
	})

	user, err := fwc.db.GetUser(ctx, fwc.userID)
	if err != nil {
		logger.WithError(err).Error("failed to get user")
		return nil, fmt.Errorf("failed to get user %d: %w", fwc.userID, err)
	}

	ctx, observation := obs.Observer.NewObservation(ctx,
		langfuse.WithObservationTraceContext(
			langfuse.WithTraceName(fmt.Sprintf("%d flow worker", flow.ID)),
			langfuse.WithTraceUserID(user.Mail),
			langfuse.WithTraceTags([]string{"controller", "flow"}),
			langfuse.WithTraceInput(fwc.input),
			langfuse.WithTraceSessionID(fmt.Sprintf("flow-%d", flow.ID)),
			langfuse.WithTraceMetadata(langfuse.Metadata{
				"flow_id":       flow.ID,
				"user_id":       fwc.userID,
				"user_email":    user.Mail,
				"user_name":     user.Name,
				"user_hash":     user.Hash,
				"user_role":     user.RoleName,
				"provider_name": fwc.prvname.String(),
				"provider_type": fwc.prvtype.String(),
			}),
		),
	)
	flowSpan := observation.Span(langfuse.WithSpanName("prepare flow worker"))
	ctx, _ = flowSpan.Observation(ctx)

	prompter, err := newUserPrompter(ctx, fwc.db, fwc.userID)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to build user prompter", err)
	}
	executor, err := tools.NewFlowToolsExecutor(fwc.db, fwc.cfg, fwc.docker, fwc.functions, fwc.userID, flow.ID)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to create flow tools executor", err)
	}
	flowProvider, err := fwc.provs.NewFlowProvider(
		ctx, fwc.prvname, prompter, executor, flow.ID, fwc.userID, fwc.cfg.AskUser, fwc.input,
	)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to get flow provider", err)
	}

	functionsBlob, err := json.Marshal(fwc.functions)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to marshal functions", err)
	}

	flow, err = fwc.db.UpdateFlow(ctx, database.UpdateFlowParams{
		Title:              flowProvider.Title(),
		Model:              flowProvider.Model(pconfig.OptionsTypePrimaryAgent),
		Language:           flowProvider.Language(),
		ToolCallIDTemplate: flowProvider.ToolCallIDTemplate(),
		Functions:          functionsBlob,
		TraceID:            database.StringToNullString(observation.TraceID()),
		ID:                 flow.ID,
	})
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to update flow in DB", err)
	}

	pub := fwc.subs.NewFlowPublisher(fwc.userID, flow.ID)
	workers, err := newFlowProviderWorkers(ctx, flow.ID, &fwc.flowProviderControllers, pub)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to create flow provider workers", err)
	}

	flowProvider.SetAgentLogProvider(workers.alw)
	flowProvider.SetMsgLogProvider(workers.mlw)

	executor.SetImage(flowProvider.Image())
	executor.SetEmbedder(flowProvider.Embedder())
	executor.SetScreenshotProvider(workers.sw)
	executor.SetAgentLogProvider(workers.alw)
	executor.SetMsgLogProvider(workers.mlw)
	executor.SetSearchLogProvider(workers.slw)
	executor.SetTermLogProvider(workers.tlw)
	executor.SetVectorStoreLogProvider(workers.vslw)
	executor.SetToolCallLogProvider(workers.tclw)
	executor.SetKnowledgeProvider(pub)
	executor.SetGraphitiClient(fwc.provs.GraphitiClient())

	flowCtx := &FlowContext{
		DB:         fwc.db,
		UserID:     fwc.userID,
		FlowID:     flow.ID,
		TraceID:    observation.TraceID(),
		Executor:   executor,
		Provider:   flowProvider,
		Publisher:  pub,
		MsgLog:     workers.mlw,
		TermLog:    workers.tlw,
		Screenshot: workers.sw,
	}
	workerCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	workerCtx, _ = obs.Observer.NewObservation(workerCtx, langfuse.WithObservationTraceID(observation.TraceID()))
	fw := &flowWorker{
		tc:      NewTaskController(flowCtx),
		wg:      &sync.WaitGroup{},
		aws:     make(map[int64]AssistantWorker),
		awsMX:   &sync.Mutex{},
		ctx:     workerCtx,
		cancel:  cancel,
		taskMX:  &sync.Mutex{},
		taskST:  func() {},
		taskWG:  &sync.WaitGroup{},
		taskCCH: make(chan struct{}),
		input:   make(chan flowInput),
		flowCtx: flowCtx,
		dataDir: fwc.cfg.DataDir,
		docker:  fwc.docker,
		logger: logrus.WithFields(logrus.Fields{
			"flow_id":   flow.ID,
			"user_id":   fwc.userID,
			"trace_id":  observation.TraceID(),
			"component": "worker",
		}),
	}

	if err := executor.Prepare(ctx); err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to prepare flow resources", err)
	}

	containers, err := fwc.db.GetFlowContainers(ctx, flow.ID)
	if err != nil {
		return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to get flow containers", err)
	}

	if fwc.flowCreatedPublished {
		fw.flowCtx.Publisher.FlowUpdated(ctx, flow, containers)
	} else {
		fw.flowCtx.Publisher.FlowCreated(ctx, flow, containers)
	}

	fw.wg.Add(1)
	go fw.worker()

	if !fwc.dryRun {
		if err := fw.PutInput(ctx, fwc.input, nil, fwc.resources); err != nil {
			return nil, wrapErrorEndSpan(ctx, flowSpan, "failed to run flow worker", err)
		}
	}

	flowSpan.End(langfuse.WithSpanStatus("flow worker started"))

	return fw, nil
}
