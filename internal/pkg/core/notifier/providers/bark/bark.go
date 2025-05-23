package bark

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/go-resty/resty/v2"

	"github.com/usual2970/certimate/internal/pkg/core/notifier"
)

type NotifierConfig struct {
	// Bark 服务地址。
	// 零值时默认使用官方服务器。
	ServerUrl string `json:"serverUrl"`
	// Bark 设备密钥。
	DeviceKey string `json:"deviceKey"`
}

type NotifierProvider struct {
	config     *NotifierConfig
	logger     *slog.Logger
	httpClient *resty.Client
}

var _ notifier.Notifier = (*NotifierProvider)(nil)

func NewNotifier(config *NotifierConfig) (*NotifierProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client := resty.New()

	return &NotifierProvider{
		config:     config,
		logger:     slog.Default(),
		httpClient: client,
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
	const defaultServerURL = "https://api.day.app/"
	serverUrl := defaultServerURL
	if n.config.ServerUrl != "" {
		serverUrl = n.config.ServerUrl
	}

	// REF: https://bark.day.app/#/tutorial
	req := n.httpClient.R().
		SetHeader("Content-Type", "application/json").
		SetBody(map[string]any{
			"title":      subject,
			"body":       message,
			"device_key": n.config.DeviceKey,
		})
	resp, err := req.Post(serverUrl)
	if err != nil {
		return nil, fmt.Errorf("bark api error: failed to send request: %w", err)
	} else if resp.IsError() {
		return nil, fmt.Errorf("bark api error: unexpected status code: %d, resp: %s", resp.StatusCode(), resp.String())
	}

	return &notifier.NotifyResult{}, nil
}
