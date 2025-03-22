﻿package serverchan

import (
	"context"
	"log/slog"
	"net/http"

	notifyHttp "github.com/nikoksr/notify/service/http"

	"github.com/usual2970/certimate/internal/pkg/core/notifier"
)

type NotifierConfig struct {
	// ServerChan 服务地址。
	Url string `json:"url"`
}

type NotifierProvider struct {
	config *NotifierConfig
	logger *slog.Logger
}

var _ notifier.Notifier = (*NotifierProvider)(nil)

func NewNotifier(config *NotifierConfig) (*NotifierProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	return &NotifierProvider{
		config: config,
	}, nil
}

func (n *NotifierProvider) WithLogger(logger *slog.Logger) notifier.Notifier {
	if logger == nil {
		n.logger = slog.Default()
	} else {
		n.logger = logger
	}
	return n
}

func (n *NotifierProvider) Notify(ctx context.Context, subject string, message string) (res *notifier.NotifyResult, err error) {
	srv := notifyHttp.New()

	srv.AddReceivers(&notifyHttp.Webhook{
		URL:         n.config.Url,
		Header:      http.Header{},
		ContentType: "application/json",
		Method:      http.MethodPost,
		BuildPayload: func(subject, message string) (payload any) {
			return map[string]string{
				"text": subject,
				"desp": message,
			}
		},
	})

	err = srv.Send(ctx, subject, message)
	if err != nil {
		return nil, err
	}

	return &notifier.NotifyResult{}, nil
}
