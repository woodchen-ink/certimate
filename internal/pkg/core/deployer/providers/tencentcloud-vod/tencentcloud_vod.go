﻿package tencentcloudvod

import (
	"context"
	"log/slog"

	xerrors "github.com/pkg/errors"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	tcvod "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/vod/v20180717"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	"github.com/usual2970/certimate/internal/pkg/core/uploader"
	uploadersp "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/tencentcloud-ssl"
)

type DeployerConfig struct {
	// 腾讯云 SecretId。
	SecretId string `json:"secretId"`
	// 腾讯云 SecretKey。
	SecretKey string `json:"secretKey"`
	// 点播应用 ID。
	SubAppId int64 `json:"subAppId"`
	// 点播加速域名（不支持泛域名）。
	Domain string `json:"domain"`
}

type DeployerProvider struct {
	config      *DeployerConfig
	logger      *slog.Logger
	sdkClient   *tcvod.Client
	sslUploader uploader.Uploader
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.SecretId, config.SecretKey)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to create sdk client")
	}

	uploader, err := uploadersp.NewUploader(&uploadersp.UploaderConfig{
		SecretId:  config.SecretId,
		SecretKey: config.SecretKey,
	})
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to create ssl uploader")
	}

	return &DeployerProvider{
		config:      config,
		logger:      slog.Default(),
		sdkClient:   client,
		sslUploader: uploader,
	}, nil
}

func (d *DeployerProvider) WithLogger(logger *slog.Logger) deployer.Deployer {
	if logger == nil {
		d.logger = slog.Default()
	} else {
		d.logger = logger
	}
	d.sslUploader.WithLogger(logger)
	return d
}

func (d *DeployerProvider) Deploy(ctx context.Context, certPem string, privkeyPem string) (*deployer.DeployResult, error) {
	// 上传证书到 SSL
	upres, err := d.sslUploader.Upload(ctx, certPem, privkeyPem)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to upload certificate file")
	} else {
		d.logger.Info("ssl certificate uploaded", slog.Any("result", upres))
	}

	// 设置点播域名 HTTPS 证书
	// REF: https://cloud.tencent.com/document/api/266/102015
	setVodDomainCertificateReq := tcvod.NewSetVodDomainCertificateRequest()
	setVodDomainCertificateReq.Domain = common.StringPtr(d.config.Domain)
	setVodDomainCertificateReq.Operation = common.StringPtr("Set")
	setVodDomainCertificateReq.CertID = common.StringPtr(upres.CertId)
	if d.config.SubAppId != 0 {
		setVodDomainCertificateReq.SubAppId = common.Uint64Ptr(uint64(d.config.SubAppId))
	}
	setVodDomainCertificateResp, err := d.sdkClient.SetVodDomainCertificate(setVodDomainCertificateReq)
	d.logger.Debug("sdk request 'vod.SetVodDomainCertificate'", slog.Any("request", setVodDomainCertificateReq), slog.Any("response", setVodDomainCertificateResp))
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to execute sdk request 'vod.SetVodDomainCertificate'")
	}

	return &deployer.DeployResult{}, nil
}

func createSdkClient(secretId, secretKey string) (*tcvod.Client, error) {
	credential := common.NewCredential(secretId, secretKey)
	client, err := tcvod.NewClient(credential, "", profile.NewClientProfile())
	if err != nil {
		return nil, err
	}

	return client, nil
}
