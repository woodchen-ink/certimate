package goedge

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	goedgesdk "github.com/usual2970/certimate/internal/pkg/sdk3rd/goedge"
	certutil "github.com/usual2970/certimate/internal/pkg/utils/cert"
)

type DeployerConfig struct {
	// GoEdge URL。
	ApiUrl string `json:"apiUrl"`
	// GoEdge 用户 AccessKeyId。
	AccessKeyId string `json:"accessKeyId"`
	// GoEdge 用户 AccessKey。
	AccessKey string `json:"accessKey"`
	// 是否允许不安全的连接。
	AllowInsecureConnections bool `json:"allowInsecureConnections,omitempty"`
	// 部署资源类型。
	ResourceType ResourceType `json:"resourceType"`
	// 证书 ID。
	// 部署资源类型为 [RESOURCE_TYPE_CERTIFICATE] 时必填。
	CertificateId int64 `json:"certificateId,omitempty"`
}

type DeployerProvider struct {
	config    *DeployerConfig
	logger    *slog.Logger
	sdkClient *goedgesdk.Client
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.ApiUrl, config.AccessKeyId, config.AccessKey, config.AllowInsecureConnections)
	if err != nil {
		return nil, fmt.Errorf("failed to create sdk client: %w", err)
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

func (d *DeployerProvider) Deploy(ctx context.Context, certPEM string, privkeyPEM string) (*deployer.DeployResult, error) {
	// 根据部署资源类型决定部署方式
	switch d.config.ResourceType {
	case RESOURCE_TYPE_CERTIFICATE:
		if err := d.deployToCertificate(ctx, certPEM, privkeyPEM); err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("unsupported resource type '%s'", d.config.ResourceType)
	}

	return &deployer.DeployResult{}, nil
}

func (d *DeployerProvider) deployToCertificate(ctx context.Context, certPEM string, privkeyPEM string) error {
	if d.config.CertificateId == 0 {
		return errors.New("config `certificateId` is required")
	}

	// 解析证书内容
	certX509, err := certutil.ParseCertificateFromPEM(certPEM)
	if err != nil {
		return err
	}

	// 修改证书
	// REF: https://goedge.cloud/dev/api/service/SSLCertService?role=user#updateSSLCert
	updateSSLCertReq := &goedgesdk.UpdateSSLCertRequest{
		SSLCertId:   d.config.CertificateId,
		IsOn:        true,
		Name:        fmt.Sprintf("certimate-%d", time.Now().UnixMilli()),
		Description: "upload from certimate",
		ServerName:  certX509.Subject.CommonName,
		IsCA:        false,
		CertData:    base64.StdEncoding.EncodeToString([]byte(certPEM)),
		KeyData:     base64.StdEncoding.EncodeToString([]byte(privkeyPEM)),
		TimeBeginAt: certX509.NotBefore.Unix(),
		TimeEndAt:   certX509.NotAfter.Unix(),
		DNSNames:    certX509.DNSNames,
		CommonNames: []string{certX509.Subject.CommonName},
	}
	updateSSLCertResp, err := d.sdkClient.UpdateSSLCert(updateSSLCertReq)
	d.logger.Debug("sdk request 'goedge.UpdateSSLCert'", slog.Any("request", updateSSLCertReq), slog.Any("response", updateSSLCertResp))
	if err != nil {
		return fmt.Errorf("failed to execute sdk request 'goedge.UpdateSSLCert': %w", err)
	}

	return nil
}

func createSdkClient(apiUrl, accessKeyId, accessKey string, skipTlsVerify bool) (*goedgesdk.Client, error) {
	if _, err := url.Parse(apiUrl); err != nil {
		return nil, errors.New("invalid goedge api url")
	}

	if accessKeyId == "" {
		return nil, errors.New("invalid goedge access key id")
	}

	if accessKey == "" {
		return nil, errors.New("invalid goedge access key")
	}

	client := goedgesdk.NewClient(apiUrl, "user", accessKeyId, accessKey)
	if skipTlsVerify {
		client.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})
	}

	return client, nil
}
