package awscloudfront

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	aws "github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	awscred "github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront/types"

	"github.com/usual2970/certimate/internal/pkg/core/deployer"
	"github.com/usual2970/certimate/internal/pkg/core/uploader"
	uploaderspacm "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/aws-acm"
	uploaderspiam "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/aws-iam"
)

type DeployerConfig struct {
	// AWS AccessKeyId。
	AccessKeyId string `json:"accessKeyId"`
	// AWS SecretAccessKey。
	SecretAccessKey string `json:"secretAccessKey"`
	// AWS 区域。
	Region string `json:"region"`
	// AWS CloudFront 分配 ID。
	DistributionId string `json:"distributionId"`
	// AWS CloudFront 证书来源。
	// 可取值 "ACM"、"IAM"。
	CertificateSource string `json:"certificateSource"`
}

type DeployerProvider struct {
	config      *DeployerConfig
	logger      *slog.Logger
	sdkClient   *cloudfront.Client
	sslUploader uploader.Uploader
}

var _ deployer.Deployer = (*DeployerProvider)(nil)

func NewDeployer(config *DeployerConfig) (*DeployerProvider, error) {
	if config == nil {
		panic("config is nil")
	}

	client, err := createSdkClient(config.AccessKeyId, config.SecretAccessKey, config.Region)
	if err != nil {
		return nil, fmt.Errorf("failed to create sdk client: %w", err)
	}

	var uploader uploader.Uploader
	if config.CertificateSource == "ACM" {
		uploader, err = uploaderspacm.NewUploader(&uploaderspacm.UploaderConfig{
			AccessKeyId:     config.AccessKeyId,
			SecretAccessKey: config.SecretAccessKey,
			Region:          config.Region,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create ssl uploader: %w", err)
		}
	} else if config.CertificateSource == "IAM" {
		uploader, err = uploaderspiam.NewUploader(&uploaderspiam.UploaderConfig{
			AccessKeyId:     config.AccessKeyId,
			SecretAccessKey: config.SecretAccessKey,
			Region:          config.Region,
			CertificatePath: "/cloudfront/",
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create ssl uploader: %w", err)
		}
	} else {
		return nil, fmt.Errorf("unsupported certificate source: '%s'", config.CertificateSource)
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
		d.logger = slog.New(slog.DiscardHandler)
	} else {
		d.logger = logger
	}
	d.sslUploader.WithLogger(logger)
	return d
}

func (d *DeployerProvider) Deploy(ctx context.Context, certPEM string, privkeyPEM string) (*deployer.DeployResult, error) {
	if d.config.DistributionId == "" {
		return nil, errors.New("config `distribuitionId` is required")
	}

	// 上传证书到 ACM/IAM
	upres, err := d.sslUploader.Upload(ctx, certPEM, privkeyPEM)
	if err != nil {
		return nil, fmt.Errorf("failed to upload certificate file: %w", err)
	} else {
		d.logger.Info("ssl certificate uploaded", slog.Any("result", upres))
	}

	// 获取分配配置
	// REF: https://docs.aws.amazon.com/en_us/cloudfront/latest/APIReference/API_GetDistributionConfig.html
	getDistributionConfigReq := &cloudfront.GetDistributionConfigInput{
		Id: aws.String(d.config.DistributionId),
	}
	getDistributionConfigResp, err := d.sdkClient.GetDistributionConfig(context.TODO(), getDistributionConfigReq)
	d.logger.Debug("sdk request 'cloudfront.GetDistributionConfig'", slog.Any("request", getDistributionConfigReq), slog.Any("response", getDistributionConfigResp))
	if err != nil {
		return nil, fmt.Errorf("failed to execute sdk request 'cloudfront.GetDistributionConfig': %w", err)
	}

	// 更新分配配置
	// REF: https://docs.aws.amazon.com/zh_cn/cloudfront/latest/APIReference/API_UpdateDistribution.html
	updateDistributionReq := &cloudfront.UpdateDistributionInput{
		Id:                 aws.String(d.config.DistributionId),
		DistributionConfig: getDistributionConfigResp.DistributionConfig,
		IfMatch:            getDistributionConfigResp.ETag,
	}
	if updateDistributionReq.DistributionConfig.ViewerCertificate == nil {
		updateDistributionReq.DistributionConfig.ViewerCertificate = &types.ViewerCertificate{}
	}
	updateDistributionReq.DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate = aws.Bool(false)
	if d.config.CertificateSource == "ACM" {
		updateDistributionReq.DistributionConfig.ViewerCertificate.ACMCertificateArn = aws.String(upres.CertId)
		updateDistributionReq.DistributionConfig.ViewerCertificate.IAMCertificateId = nil
	} else if d.config.CertificateSource == "IAM" {
		updateDistributionReq.DistributionConfig.ViewerCertificate.ACMCertificateArn = nil
		updateDistributionReq.DistributionConfig.ViewerCertificate.IAMCertificateId = aws.String(upres.CertId)
		if updateDistributionReq.DistributionConfig.ViewerCertificate.MinimumProtocolVersion == "" {
			updateDistributionReq.DistributionConfig.ViewerCertificate.MinimumProtocolVersion = types.MinimumProtocolVersionTLSv1
		}
		if updateDistributionReq.DistributionConfig.ViewerCertificate.SSLSupportMethod == "" {
			updateDistributionReq.DistributionConfig.ViewerCertificate.SSLSupportMethod = types.SSLSupportMethodSniOnly
		}
	}
	updateDistributionResp, err := d.sdkClient.UpdateDistribution(context.TODO(), updateDistributionReq)
	d.logger.Debug("sdk request 'cloudfront.UpdateDistribution'", slog.Any("request", updateDistributionReq), slog.Any("response", updateDistributionResp))
	if err != nil {
		return nil, fmt.Errorf("failed to execute sdk request 'cloudfront.UpdateDistribution': %w", err)
	}

	return &deployer.DeployResult{}, nil
}

func createSdkClient(accessKeyId, secretAccessKey, region string) (*cloudfront.Client, error) {
	cfg, err := awscfg.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, err
	}

	client := cloudfront.NewFromConfig(cfg, func(o *cloudfront.Options) {
		o.Region = region
		o.Credentials = aws.NewCredentialsCache(awscred.NewStaticCredentialsProvider(accessKeyId, secretAccessKey, ""))
	})
	return client, nil
}
