﻿package cdnfly

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	xerrors "github.com/pkg/errors"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	cfsdk "github.com/usual2970/certimate/internal/pkg/vendors/cdnfly-sdk"
)

type DeployerConfig struct {
	// Cdnfly 地址。
	ApiUrl string `json:"apiUrl"`
	// Cdnfly 用户端 API Key。
	ApiKey string `json:"apiKey"`
	// Cdnfly 用户端 API Secret。
	ApiSecret string `json:"apiSecret"`
	// 部署资源类型。
	ResourceType ResourceType `json:"resourceType"`
	// 网站 ID。
	// 部署资源类型为 [RESOURCE_TYPE_SITE] 时必填。
	SiteId string `json:"siteId,omitempty"`
	// 证书 ID。
	// 部署资源类型为 [RESOURCE_TYPE_CERTIFICATE] 时必填。
	CertificateId string `json:"certificateId,omitempty"`
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

	client, err := createSdkClient(config.ApiUrl, config.ApiKey, config.ApiSecret)
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
	// 根据部署资源类型决定部署方式
	switch d.config.ResourceType {
	case RESOURCE_TYPE_SITE:
		if err := d.deployToSite(ctx, certPem, privkeyPem); err != nil {
			return nil, err
		}

	case RESOURCE_TYPE_CERTIFICATE:
		if err := d.deployToCertificate(ctx, certPem, privkeyPem); err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("unsupported resource type: %s", d.config.ResourceType)
	}

	return &deployer.DeployResult{}, nil
}

func (d *DeployerProvider) deployToSite(ctx context.Context, certPem string, privkeyPem string) error {
	if d.config.SiteId == "" {
		return errors.New("config `siteId` is required")
	}

	// 获取单个网站详情
	// REF: https://doc.cdnfly.cn/wangzhanguanli-v1-sites.html#%E8%8E%B7%E5%8F%96%E5%8D%95%E4%B8%AA%E7%BD%91%E7%AB%99%E8%AF%A6%E6%83%85
	getSiteReq := &cfsdk.GetSiteRequest{
		Id: d.config.SiteId,
	}
	getSiteResp, err := d.sdkClient.GetSite(getSiteReq)
	d.logger.Debug("sdk request 'cdnfly.GetSite'", slog.Any("request", getSiteReq), slog.Any("response", getSiteResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'cdnfly.GetSite'")
	}

	// 添加单个证书
	// REF: https://doc.cdnfly.cn/wangzhanzhengshu-v1-certs.html#%E6%B7%BB%E5%8A%A0%E5%8D%95%E4%B8%AA%E6%88%96%E5%A4%9A%E4%B8%AA%E8%AF%81%E4%B9%A6-%E5%A4%9A%E4%B8%AA%E8%AF%81%E4%B9%A6%E6%97%B6%E6%95%B0%E6%8D%AE%E6%A0%BC%E5%BC%8F%E4%B8%BA%E6%95%B0%E7%BB%84
	createCertificateReq := &cfsdk.CreateCertificateRequest{
		Name: fmt.Sprintf("certimate-%d", time.Now().UnixMilli()),
		Type: "custom",
		Cert: certPem,
		Key:  privkeyPem,
	}
	createCertificateResp, err := d.sdkClient.CreateCertificate(createCertificateReq)
	d.logger.Debug("sdk request 'cdnfly.CreateCertificate'", slog.Any("request", createCertificateReq), slog.Any("response", createCertificateResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'cdnfly.CreateCertificate'")
	}

	// 修改单个网站
	// REF: https://doc.cdnfly.cn/wangzhanguanli-v1-sites.html#%E4%BF%AE%E6%94%B9%E5%8D%95%E4%B8%AA%E7%BD%91%E7%AB%99
	updateSiteHttpsListenMap := make(map[string]any)
	_ = json.Unmarshal([]byte(getSiteResp.Data.HttpsListen), &updateSiteHttpsListenMap)
	updateSiteHttpsListenMap["cert"] = createCertificateResp.Data
	updateSiteHttpsListenData, _ := json.Marshal(updateSiteHttpsListenMap)
	updateSiteHttpsListen := string(updateSiteHttpsListenData)
	updateSiteReq := &cfsdk.UpdateSiteRequest{
		Id:          d.config.SiteId,
		HttpsListen: &updateSiteHttpsListen,
	}
	updateSiteResp, err := d.sdkClient.UpdateSite(updateSiteReq)
	d.logger.Debug("sdk request 'cdnfly.UpdateSite'", slog.Any("request", updateSiteReq), slog.Any("response", updateSiteResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'cdnfly.UpdateSite'")
	}

	return nil
}

func (d *DeployerProvider) deployToCertificate(ctx context.Context, certPem string, privkeyPem string) error {
	if d.config.CertificateId == "" {
		return errors.New("config `certificateId` is required")
	}

	// 修改单个证书
	// REF: https://doc.cdnfly.cn/wangzhanzhengshu-v1-certs.html#%E4%BF%AE%E6%94%B9%E5%8D%95%E4%B8%AA%E8%AF%81%E4%B9%A6
	updateCertificateType := "custom"
	updateCertificateReq := &cfsdk.UpdateCertificateRequest{
		Id:   d.config.CertificateId,
		Type: &updateCertificateType,
		Cert: &certPem,
		Key:  &privkeyPem,
	}
	updateCertificateResp, err := d.sdkClient.UpdateCertificate(updateCertificateReq)
	d.logger.Debug("sdk request 'cdnfly.UpdateCertificate'", slog.Any("request", updateCertificateReq), slog.Any("response", updateCertificateResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'cdnfly.UpdateCertificate'")
	}

	return nil
}

func createSdkClient(apiUrl, apiKey, apiSecret string) (*cfsdk.Client, error) {
	if _, err := url.Parse(apiUrl); err != nil {
		return nil, errors.New("invalid cachefly api url")
	}

	if apiKey == "" {
		return nil, errors.New("invalid cachefly api key")
	}

	if apiSecret == "" {
		return nil, errors.New("invalid cachefly api secret")
	}

	client := cfsdk.NewClient(apiUrl, apiKey, apiSecret)
	return client, nil
}
