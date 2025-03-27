﻿package bytepluscdn

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	bpcdn "github.com/byteplus-sdk/byteplus-sdk-golang/service/cdn"
	xerrors "github.com/pkg/errors"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	"github.com/usual2970/certimate/internal/pkg/core/uploader"
	uploadersp "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/byteplus-cdn"
)

type DeployerConfig struct {
	// BytePlus AccessKey。
	AccessKey string `json:"accessKey"`
	// BytePlus SecretKey。
	SecretKey string `json:"secretKey"`
	// 加速域名（支持泛域名）。
	Domain string `json:"domain"`
}

type DeployerProvider struct {
	config      *DeployerConfig
	logger      *slog.Logger
	sdkClient   *bpcdn.CDN
	sslUploader uploader.Uploader
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client := bpcdn.NewInstance()
	client.Client.SetAccessKey(config.AccessKey)
	client.Client.SetSecretKey(config.SecretKey)

	uploader, err := uploadersp.NewUploader(&uploadersp.UploaderConfig{
		AccessKey: config.AccessKey,
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
	// 上传证书到 CDN
	upres, err := d.sslUploader.Upload(ctx, certPem, privkeyPem)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to upload certificate file")
	} else {
		d.logger.Info("ssl certificate uploaded", slog.Any("result", upres))
	}

	domains := make([]string, 0)
	if strings.HasPrefix(d.config.Domain, "*.") {
		// 获取指定证书可关联的域名
		// REF: https://docs.byteplus.com/en/docs/byteplus-cdn/reference-describecertconfig-9ea17
		describeCertConfigReq := &bpcdn.DescribeCertConfigRequest{
			CertId: upres.CertId,
		}
		describeCertConfigResp, err := d.sdkClient.DescribeCertConfig(describeCertConfigReq)
		d.logger.Debug("sdk request 'cdn.DescribeCertConfig'", slog.Any("request", describeCertConfigReq), slog.Any("response", describeCertConfigResp))
		if err != nil {
			return nil, xerrors.Wrap(err, "failed to execute sdk request 'cdn.DescribeCertConfig'")
		}

		if describeCertConfigResp.Result.CertNotConfig != nil {
			for i := range describeCertConfigResp.Result.CertNotConfig {
				domains = append(domains, describeCertConfigResp.Result.CertNotConfig[i].Domain)
			}
		}

		if describeCertConfigResp.Result.OtherCertConfig != nil {
			for i := range describeCertConfigResp.Result.OtherCertConfig {
				domains = append(domains, describeCertConfigResp.Result.OtherCertConfig[i].Domain)
			}
		}

		if len(domains) == 0 {
			if len(describeCertConfigResp.Result.SpecifiedCertConfig) > 0 {
				// 所有可关联的域名都配置了该证书，跳过部署
				d.logger.Info("no domains to deploy")
			} else {
				return nil, errors.New("domain not found")
			}
		}
	} else {
		domains = append(domains, d.config.Domain)
	}

	if len(domains) > 0 {
		var errs []error

		for _, domain := range domains {
			// 关联证书与加速域名
			// REF: https://docs.byteplus.com/en/docs/byteplus-cdn/reference-batchdeploycert
			batchDeployCertReq := &bpcdn.BatchDeployCertRequest{
				CertId: upres.CertId,
				Domain: domain,
			}
			batchDeployCertResp, err := d.sdkClient.BatchDeployCert(batchDeployCertReq)
			d.logger.Debug("sdk request 'cdn.BatchDeployCert'", slog.Any("request", batchDeployCertReq), slog.Any("response", batchDeployCertResp))
			if err != nil {
				errs = append(errs, err)
			}
		}

		if len(errs) > 0 {
			return nil, errors.Join(errs...)
		}
	}

	return &deployer.DeployResult{}, nil
}
