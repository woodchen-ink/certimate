﻿package wangsucdnpro_test

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"testing"

	provider "github.com/usual2970/certimate/internal/pkg/core/deployer/providers/wangsu-cdnpro"
)

var (
	fInputCertPath   string
	fInputKeyPath    string
	fAccessKeyId     string
	fAccessKeySecret string
	fEnvironment     string
	fDomain          string
	fCertificateId   string
	fWebhookId       string
)

func init() {
	argsPrefix := "CERTIMATE_DEPLOYER_WANGSUCDNPRO_"

	flag.StringVar(&fInputCertPath, argsPrefix+"INPUTCERTPATH", "", "")
	flag.StringVar(&fInputKeyPath, argsPrefix+"INPUTKEYPATH", "", "")
	flag.StringVar(&fAccessKeyId, argsPrefix+"ACCESSKEYID", "", "")
	flag.StringVar(&fAccessKeySecret, argsPrefix+"ACCESSKEYSECRET", "", "")
	flag.StringVar(&fEnvironment, argsPrefix+"ENVIRONMENT", "production", "")
	flag.StringVar(&fDomain, argsPrefix+"DOMAIN", "", "")
	flag.StringVar(&fCertificateId, argsPrefix+"CERTIFICATEID", "", "")
	flag.StringVar(&fWebhookId, argsPrefix+"WEBHOOKID", "", "")
}

/*
Shell command to run this test:

	go test -v ./wangsu_cdnpro_test.go -args \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_INPUTCERTPATH="/path/to/your-input-cert.pem" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_INPUTKEYPATH="/path/to/your-input-key.pem" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_ACCESSKEYID="your-access-key-id" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_ACCESSKEYSECRET="your-access-key-secret" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_ENVIRONMENT="production" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_DOMAIN="example.com" \
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_CERTIFICATEID="your-certificate-id"\
	--CERTIMATE_DEPLOYER_WANGSUCDNPRO_WEBHOOKID="your-webhook-id"
*/
func TestDeploy(t *testing.T) {
	flag.Parse()

	t.Run("Deploy", func(t *testing.T) {
		t.Log(strings.Join([]string{
			"args:",
			fmt.Sprintf("INPUTCERTPATH: %v", fInputCertPath),
			fmt.Sprintf("INPUTKEYPATH: %v", fInputKeyPath),
			fmt.Sprintf("ACCESSKEYID: %v", fAccessKeyId),
			fmt.Sprintf("ACCESSKEYSECRET: %v", fAccessKeySecret),
			fmt.Sprintf("ENVIRONMENT: %v", fEnvironment),
			fmt.Sprintf("DOMAIN: %v", fDomain),
			fmt.Sprintf("CERTIFICATEID: %v", fCertificateId),
			fmt.Sprintf("WEBHOOKID: %v", fWebhookId),
		}, "\n"))

		deployer, err := provider.NewDeployer(&provider.DeployerConfig{
			AccessKeyId:     fAccessKeyId,
			AccessKeySecret: fAccessKeySecret,
			Environment:     fEnvironment,
			Domain:          fDomain,
			CertificateId:   fCertificateId,
			WebhookId:       fWebhookId,
		})
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		fInputCertData, _ := os.ReadFile(fInputCertPath)
		fInputKeyData, _ := os.ReadFile(fInputKeyPath)
		res, err := deployer.Deploy(context.Background(), string(fInputCertData), string(fInputKeyData))
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		t.Logf("ok: %v", res)
	})
}
