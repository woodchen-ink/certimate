﻿package baotapanelconsole

import (
	"context"
	"crypto/tls"
	"errors"
	"log/slog"
	"net/url"

	xerrors "github.com/pkg/errors"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	btsdk "github.com/usual2970/certimate/internal/pkg/vendors/btpanel-sdk"
)

type DeployerConfig struct {
	// 宝塔面板地址。
	ApiUrl string `json:"apiUrl"`
	// 宝塔面板接口密钥。
	ApiKey string `json:"apiKey"`
	// 是否允许不安全的连接。
	AllowInsecureConnections bool `json:"allowInsecureConnections,omitempty"`
	// 是否自动重启。
	AutoRestart bool `json:"autoRestart"`
}

type DeployerProvider struct {
	config    *DeployerConfig
	logger    *slog.Logger
	sdkClient *btsdk.Client
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.ApiUrl, config.ApiKey, config.AllowInsecureConnections)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to create sdk client")
	}

	return &DeployerProvider{
		config:    config,
		logger:    slog.Default(),
		sdkClient: client,
	}, nil
}

func (d *DeployerProvider) WithLogger(logger *slog.Logger) deployer.Deployer {
	if logger == nil {
		d.logger = slog.Default()
	} else {
		d.logger = logger
	}
	return d
}

func (d *DeployerProvider) Deploy(ctx context.Context, certPem string, privkeyPem string) (*deployer.DeployResult, error) {
	// 设置面板 SSL 证书
	configSavePanelSSLReq := &btsdk.ConfigSavePanelSSLRequest{
		PrivateKey:  privkeyPem,
		Certificate: certPem,
	}
	configSavePanelSSLResp, err := d.sdkClient.ConfigSavePanelSSL(configSavePanelSSLReq)
	d.logger.Debug("sdk request 'bt.ConfigSavePanelSSL'", slog.Any("request", configSavePanelSSLReq), slog.Any("response", configSavePanelSSLResp))
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to execute sdk request 'bt.ConfigSavePanelSSL'")
	}

	if d.config.AutoRestart {
		// 重启面板（无需关心响应，因为宝塔重启时会断开连接产生 error）
		systemServiceAdminReq := &btsdk.SystemServiceAdminRequest{
			Name: "nginx",
			Type: "restart",
		}
		systemServiceAdminResp, _ := d.sdkClient.SystemServiceAdmin(systemServiceAdminReq)
		d.logger.Debug("sdk request 'bt.SystemServiceAdmin'", slog.Any("request", systemServiceAdminReq), slog.Any("response", systemServiceAdminResp))
	}

	return &deployer.DeployResult{}, nil
}

func createSdkClient(apiUrl, apiKey string, allowInsecure bool) (*btsdk.Client, error) {
	if _, err := url.Parse(apiUrl); err != nil {
		return nil, errors.New("invalid baota api url")
	}

	if apiKey == "" {
		return nil, errors.New("invalid baota api key")
	}

	client := btsdk.NewClient(apiUrl, apiKey)
	if allowInsecure {
		client.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})
	}

	return client, nil
}
