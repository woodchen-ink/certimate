﻿package volcenginealb

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	xerrors "github.com/pkg/errors"
	vealb "github.com/volcengine/volcengine-go-sdk/service/alb"
	ve "github.com/volcengine/volcengine-go-sdk/volcengine"
	vesession "github.com/volcengine/volcengine-go-sdk/volcengine/session"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	"github.com/usual2970/certimate/internal/pkg/core/uploader"
	uploadersp "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/volcengine-certcenter"
	"github.com/usual2970/certimate/internal/pkg/utils/sliceutil"
)

type DeployerConfig struct {
	// 火山引擎 AccessKeyId。
	AccessKeyId string `json:"accessKeyId"`
	// 火山引擎 AccessKeySecret。
	AccessKeySecret string `json:"accessKeySecret"`
	// 火山引擎地域。
	Region string `json:"region"`
	// 部署资源类型。
	ResourceType ResourceType `json:"resourceType"`
	// 负载均衡实例 ID。
	// 部署资源类型为 [RESOURCE_TYPE_LOADBALANCER] 时必填。
	LoadbalancerId string `json:"loadbalancerId,omitempty"`
	// 负载均衡监听器 ID。
	// 部署资源类型为 [RESOURCE_TYPE_LISTENER] 时必填。
	ListenerId string `json:"listenerId,omitempty"`
	// SNI 域名（支持泛域名）。
	// 部署资源类型为 [RESOURCE_TYPE_LOADBALANCER]、[RESOURCE_TYPE_LISTENER] 时选填。
	Domain string `json:"domain,omitempty"`
}

type DeployerProvider struct {
	config      *DeployerConfig
	logger      *slog.Logger
	sdkClient   *vealb.ALB
	sslUploader uploader.Uploader
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.AccessKeyId, config.AccessKeySecret, config.Region)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to create sdk client")
	}

	uploader, err := uploadersp.NewUploader(&uploadersp.UploaderConfig{
		AccessKeyId:     config.AccessKeyId,
		AccessKeySecret: config.AccessKeySecret,
		Region:          config.Region,
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
	// 上传证书到证书中心
	upres, err := d.sslUploader.Upload(ctx, certPem, privkeyPem)
	if err != nil {
		return nil, xerrors.Wrap(err, "failed to upload certificate file")
	} else {
		d.logger.Info("ssl certificate uploaded", slog.Any("result", upres))
	}

	// 根据部署资源类型决定部署方式
	switch d.config.ResourceType {
	case RESOURCE_TYPE_LOADBALANCER:
		if err := d.deployToLoadbalancer(ctx, upres.CertId); err != nil {
			return nil, err
		}

	case RESOURCE_TYPE_LISTENER:
		if err := d.deployToListener(ctx, upres.CertId); err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("unsupported resource type: %s", d.config.ResourceType)
	}

	return &deployer.DeployResult{}, nil
}

func (d *DeployerProvider) deployToLoadbalancer(ctx context.Context, cloudCertId string) error {
	if d.config.LoadbalancerId == "" {
		return errors.New("config `loadbalancerId` is required")
	}

	// 查询 ALB 实例的详细信息
	// REF: https://www.volcengine.com/docs/6767/113596
	describeLoadBalancerAttributesReq := &vealb.DescribeLoadBalancerAttributesInput{
		LoadBalancerId: ve.String(d.config.LoadbalancerId),
	}
	describeLoadBalancerAttributesResp, err := d.sdkClient.DescribeLoadBalancerAttributes(describeLoadBalancerAttributesReq)
	d.logger.Debug("sdk request 'alb.DescribeLoadBalancerAttributes'", slog.Any("request", describeLoadBalancerAttributesReq), slog.Any("response", describeLoadBalancerAttributesResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'alb.DescribeLoadBalancerAttributes'")
	}

	// 查询 HTTPS 监听器列表
	// REF: https://www.volcengine.com/docs/6767/113684
	listenerIds := make([]string, 0)
	describeListenersPageSize := int64(100)
	describeListenersPageNumber := int64(1)
	for {
		describeListenersReq := &vealb.DescribeListenersInput{
			LoadBalancerId: ve.String(d.config.LoadbalancerId),
			Protocol:       ve.String("HTTPS"),
			PageNumber:     ve.Int64(describeListenersPageNumber),
			PageSize:       ve.Int64(describeListenersPageSize),
		}
		describeListenersResp, err := d.sdkClient.DescribeListeners(describeListenersReq)
		d.logger.Debug("sdk request 'alb.DescribeListeners'", slog.Any("request", describeListenersReq), slog.Any("response", describeListenersResp))
		if err != nil {
			return xerrors.Wrap(err, "failed to execute sdk request 'alb.DescribeListeners'")
		}

		for _, listener := range describeListenersResp.Listeners {
			listenerIds = append(listenerIds, *listener.ListenerId)
		}

		if len(describeListenersResp.Listeners) < int(describeListenersPageSize) {
			break
		} else {
			describeListenersPageNumber++
		}
	}

	// 遍历更新监听证书
	if len(listenerIds) == 0 {
		d.logger.Info("no alb listeners to deploy")
	} else {
		d.logger.Info("found https listeners to deploy", slog.Any("listenerIds", listenerIds))
		var errs []error

		for _, listenerId := range listenerIds {
			if err := d.updateListenerCertificate(ctx, listenerId, cloudCertId); err != nil {
				errs = append(errs, err)
			}
		}

		if len(errs) > 0 {
			return errors.Join(errs...)
		}
	}

	return nil
}

func (d *DeployerProvider) deployToListener(ctx context.Context, cloudCertId string) error {
	if d.config.ListenerId == "" {
		return errors.New("config `listenerId` is required")
	}

	if err := d.updateListenerCertificate(ctx, d.config.LoadbalancerId, cloudCertId); err != nil {
		return err
	}

	return nil
}

func (d *DeployerProvider) updateListenerCertificate(ctx context.Context, cloudListenerId string, cloudCertId string) error {
	// 查询指定监听器的详细信息
	// REF: https://www.volcengine.com/docs/6767/113686
	describeListenerAttributesReq := &vealb.DescribeListenerAttributesInput{
		ListenerId: ve.String(cloudListenerId),
	}
	describeListenerAttributesResp, err := d.sdkClient.DescribeListenerAttributes(describeListenerAttributesReq)
	d.logger.Debug("sdk request 'alb.DescribeListenerAttributes'", slog.Any("request", describeListenerAttributesReq), slog.Any("response", describeListenerAttributesResp))
	if err != nil {
		return xerrors.Wrap(err, "failed to execute sdk request 'alb.DescribeListenerAttributes'")
	}

	if d.config.Domain == "" {
		// 未指定 SNI，只需部署到监听器

		// 修改指定监听器
		// REF: https://www.volcengine.com/docs/6767/113683
		modifyListenerAttributesReq := &vealb.ModifyListenerAttributesInput{
			ListenerId:              ve.String(cloudListenerId),
			CertificateSource:       ve.String("cert_center"),
			CertCenterCertificateId: ve.String(cloudCertId),
		}
		modifyListenerAttributesResp, err := d.sdkClient.ModifyListenerAttributes(modifyListenerAttributesReq)
		d.logger.Debug("sdk request 'alb.ModifyListenerAttributes'", slog.Any("request", modifyListenerAttributesReq), slog.Any("response", modifyListenerAttributesResp))
		if err != nil {
			return xerrors.Wrap(err, "failed to execute sdk request 'alb.ModifyListenerAttributes'")
		}
	} else {
		// 指定 SNI，需部署到扩展域名

		// 修改指定监听器
		// REF: https://www.volcengine.com/docs/6767/113683
		modifyListenerAttributesReq := &vealb.ModifyListenerAttributesInput{
			ListenerId: ve.String(cloudListenerId),
			DomainExtensions: sliceutil.Map(
				sliceutil.Filter(
					describeListenerAttributesResp.DomainExtensions,
					func(domain *vealb.DomainExtensionForDescribeListenerAttributesOutput) bool {
						return *domain.Domain == d.config.Domain
					},
				),
				func(domain *vealb.DomainExtensionForDescribeListenerAttributesOutput) *vealb.DomainExtensionForModifyListenerAttributesInput {
					return &vealb.DomainExtensionForModifyListenerAttributesInput{
						DomainExtensionId:       domain.DomainExtensionId,
						Domain:                  domain.Domain,
						CertificateSource:       ve.String("cert_center"),
						CertCenterCertificateId: ve.String(cloudCertId),
						Action:                  ve.String("modify"),
					}
				}),
		}
		modifyListenerAttributesResp, err := d.sdkClient.ModifyListenerAttributes(modifyListenerAttributesReq)
		d.logger.Debug("sdk request 'alb.ModifyListenerAttributes'", slog.Any("request", modifyListenerAttributesReq), slog.Any("response", modifyListenerAttributesResp))
		if err != nil {
			return xerrors.Wrap(err, "failed to execute sdk request 'alb.ModifyListenerAttributes'")
		}
	}

	return nil
}

func createSdkClient(accessKeyId, accessKeySecret, region string) (*vealb.ALB, error) {
	config := ve.NewConfig().WithRegion(region).WithAkSk(accessKeyId, accessKeySecret)

	session, err := vesession.NewSession(config)
	if err != nil {
		return nil, err
	}

	client := vealb.New(session)
	return client, nil
}
