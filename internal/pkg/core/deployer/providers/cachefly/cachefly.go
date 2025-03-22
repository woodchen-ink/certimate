﻿package cachefly

import (
	"context"
	"errors"
	"log/slog"

	xerrors "github.com/pkg/errors"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	cfsdk "github.com/usual2970/certimate/internal/pkg/vendors/cachefly-sdk"
)

type DeployerConfig struct {
	// CacheFly API Token。
	ApiToken string `json:"apiToken"`
}

type DeployerProvider struct {
	config    *DeployerConfig
	logger    *slog.Logger
	sdkClient *cfsdk.Client
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.ApiToken)
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
	// 上传证书
	createCertificateReq := &cfsdk.CreateCertificateRequest{
		Certificate:    certPem,
		CertificateKey: privkeyPem,
	}
	createCertificateResp, err := d.sdkClient.CreateCertificate(createCertificateReq)
	d.logger.Debug("sdk request 'cachefly.CreateCertificate'", slog.Any("request", createCertificateReq), slog.Any("response", createCertificateResp))
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to execute sdk request 'cachefly.CreateCertificate'")
	}

	return &deployer.DeployResult{}, nil
}

func createSdkClient(apiToken string) (*cfsdk.Client, error) {
	if apiToken == "" {
		return nil, errors.New("invalid cachefly api token")
	}

	client := cfsdk.NewClient(apiToken)
	return client, nil
}
