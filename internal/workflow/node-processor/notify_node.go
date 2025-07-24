package nodeprocessor

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/certimate-go/certimate/internal/domain"
	"github.com/certimate-go/certimate/internal/notify"
	"github.com/certimate-go/certimate/internal/repository"
)

type notifyNode struct {
	node *domain.WorkflowNode
	*nodeProcessor
	*nodeOutputer

	settingsRepo settingsRepository
}

func NewNotifyNode(node *domain.WorkflowNode) *notifyNode {
	return &notifyNode{
		node:          node,
		nodeProcessor: newNodeProcessor(node),
		nodeOutputer:  newNodeOutputer(),

		settingsRepo: repository.NewSettingsRepository(),
	}
}

func (n *notifyNode) Process(ctx context.Context) error {
	nodeCfg := n.node.GetConfigForNotify()
	n.logger.Info("ready to send notification ...", slog.Any("config", nodeCfg))

	// 检测是否可以跳过本次执行
	if skippable := n.checkCanSkip(ctx); skippable {
		n.logger.Info(fmt.Sprintf("skip this notification, because all the previous nodes have been skipped"))
		return nil
	}

	// 初始化通知器
	deployer, err := notify.NewWithWorkflowNode(notify.NotifierWithWorkflowNodeConfig{
		Node:    n.node,
		Logger:  n.logger,
		Subject: nodeCfg.Subject,
		Message: nodeCfg.Message,
	})
	if err != nil {
		n.logger.Warn("failed to create notifier provider")
		return err
	}

	// 推送通知
	if err := deployer.Notify(ctx); err != nil {
		n.logger.Warn("failed to send notification")
		return err
	}

	n.logger.Info("notification completed")
	return nil
}

func (n *notifyNode) checkCanSkip(ctx context.Context) (_skip bool) {
	thisNodeCfg := n.node.GetConfigForNotify()
	if !thisNodeCfg.SkipOnAllPrevSkipped {
		return false
	}

	prevNodeOutputs := GetAllNodeOutputs(ctx)
	for _, nodeOutput := range prevNodeOutputs {
		if nodeOutput[outputKeyForNodeSkipped] != nil {
			if nodeOutput[outputKeyForNodeSkipped].(string) != strconv.FormatBool(true) {
				return false
			}
		}
	}

	return true
}
