package services

import (
	"database/sql"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/graph/subscriptions"
	"pentagi/pkg/server/logger"
	"pentagi/pkg/server/models"
	"pentagi/pkg/server/response"
	"pentagi/pkg/shannon"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
)

type ShannonService struct {
	db  *gorm.DB
	job *shannon.Job
	ss  subscriptions.SubscriptionsController
}

func NewShannonService(
	db *gorm.DB,
	cfg *config.Config,
	ss subscriptions.SubscriptionsController,
) *ShannonService {
	runner := shannon.NewRunner(shannon.Config{
		Enabled:      cfg.ShannonEnabled,
		WorkspaceDir: cfg.ShannonWorkspaceDir,
		Command:      cfg.ShannonCommand,
		Timeout:      time.Duration(cfg.ShannonTimeout) * time.Second,
	})

	return &ShannonService{
		db:  db,
		job: shannon.NewJob(runner),
		ss:  ss,
	}
}

// RunFlowShannonScan runs a Shannon white-box scan for an existing Advanced Mode flow.
// @Summary Run Shannon white-box scan
// @Tags Shannon
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param flowID path int true "flow id" minimum(0)
// @Param request body shannon.ScanRequest true "shannon scan request"
// @Success 200 {object} response.successResp{data=shannon.ScanResult} "shannon scan completed"
// @Failure 400 {object} response.errorResp "invalid shannon scan request"
// @Failure 403 {object} response.errorResp "running shannon scan not permitted"
// @Failure 404 {object} response.errorResp "flow not found"
// @Failure 500 {object} response.errorResp "internal error on shannon scan"
// @Router /flows/{flowID}/shannon/scan [post]
func (s *ShannonService) RunFlowShannonScan(c *gin.Context) {
	var (
		err    error
		flowID uint64
		req    shannon.ScanRequest
		flow   models.Flow
	)

	if flowID, err = strconv.ParseUint(c.Param("flowID"), 10, 64); err != nil {
		logger.FromContext(c).WithError(err).Errorf("error parsing flow id")
		response.Error(c, response.ErrShannonInvalidRequest, err)
		return
	}

	if err = c.ShouldBindJSON(&req); err != nil {
		logger.FromContext(c).WithError(err).Errorf("error binding shannon scan request")
		response.Error(c, response.ErrShannonInvalidRequest, err)
		return
	}

	uid := c.GetUint64("uid")
	privs := c.GetStringSlice("prm")
	var scope func(db *gorm.DB) *gorm.DB
	if slices.Contains(privs, "flows.admin") {
		scope = func(db *gorm.DB) *gorm.DB {
			return db.Where("id = ?", flowID)
		}
	} else if slices.Contains(privs, "flows.edit") {
		scope = func(db *gorm.DB) *gorm.DB {
			return db.Where("id = ? AND user_id = ?", flowID, uid)
		}
	} else {
		logger.FromContext(c).Errorf("error filtering user role permissions: permission not found")
		response.Error(c, response.ErrNotPermitted, nil)
		return
	}

	if err = s.db.Model(&flow).Scopes(scope).Take(&flow).Error; err != nil {
		logger.FromContext(c).WithError(err).Errorf("error on getting flow for shannon scan")
		if gorm.IsRecordNotFoundError(err) {
			response.Error(c, response.ErrFlowsNotFound, err)
		} else {
			response.Error(c, response.ErrInternal, err)
		}
		return
	}

	result, err := s.job.RunScan(c.Request.Context(), req)
	if err != nil {
		logger.FromContext(c).WithError(err).Errorf("error running shannon scan")
		response.Error(c, response.ErrShannonRunFailed, err)
		return
	}

	if req.ImportReportAsFlowResult {
		task := models.Task{
			Status: models.TaskStatusFinished,
			Title:  "Shannon verified findings",
			Input: fmt.Sprintf(
				"Shannon white-box scan for %s using workspace %s",
				req.TargetURL,
				result.WorkspacePath,
			),
			Result: result.Report.Markdown,
			FlowID: flowID,
		}
		if err = s.db.Create(&task).Error; err != nil {
			logger.FromContext(c).WithError(err).Errorf("error importing shannon report as task")
			response.Error(c, response.ErrInternal, err)
			return
		}

		s.ss.NewFlowPublisher(int64(flow.UserID), int64(flowID)).TaskCreated(c.Request.Context(), database.Task{
			ID:        int64(task.ID),
			Status:    database.TaskStatusFinished,
			Title:     task.Title,
			Input:     task.Input,
			Result:    task.Result,
			FlowID:    int64(task.FlowID),
			CreatedAt: sqlTime(task.CreatedAt),
			UpdatedAt: sqlTime(task.UpdatedAt),
		}, []database.Subtask{})
	}

	response.Success(c, http.StatusOK, result)
}

func sqlTime(t time.Time) sql.NullTime {
	return sql.NullTime{Time: t, Valid: !t.IsZero()}
}
