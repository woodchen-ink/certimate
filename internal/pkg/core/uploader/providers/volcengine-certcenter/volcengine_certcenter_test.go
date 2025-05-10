package volcenginecertcenter_test

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"testing"

	provider "github.com/usual2970/certimate/internal/pkg/core/uploader/providers/volcengine-certcenter"
)

var (
	fInputCertPath   string
	fInputKeyPath    string
	fAccessKeyId     string
	fAccessKeySecret string
)

func init() {
	argsPrefix := "CERTIMATE_UPLOADER_VOLCENGINECERTCENTER_"

	flag.StringVar(&fInputCertPath, argsPrefix+"INPUTCERTPATH", "", "")
	flag.StringVar(&fInputKeyPath, argsPrefix+"INPUTKEYPATH", "", "")
	flag.StringVar(&fAccessKeyId, argsPrefix+"ACCESSKEYID", "", "")
	flag.StringVar(&fAccessKeySecret, argsPrefix+"ACCESSKEYSECRET", "", "")
}

/*
Shell command to run this test:

	go test -v ./volcengine_certcenter_test.go -args \
	--CERTIMATE_UPLOADER_VOLCENGINECERTCENTER_INPUTCERTPATH="/path/to/your-input-cert.pem" \
	--CERTIMATE_UPLOADER_VOLCENGINECERTCENTER_INPUTKEYPATH="/path/to/your-input-key.pem" \
	--CERTIMATE_UPLOADER_VOLCENGINECERTCENTER_ACCESSKEYID="your-access-key-id" \
	--CERTIMATE_UPLOADER_VOLCENGINECERTCENTER_ACCESSKEYSECRET="your-access-key-secret"
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
		}, "\n"))

		uploader, err := provider.NewUploader(&provider.UploaderConfig{
			AccessKeyId:     fAccessKeyId,
			AccessKeySecret: fAccessKeySecret,
		})
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		fInputCertData, _ := os.ReadFile(fInputCertPath)
		fInputKeyData, _ := os.ReadFile(fInputKeyPath)
		res, err := uploader.Upload(context.Background(), string(fInputCertData), string(fInputKeyData))
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		sres, _ := json.Marshal(res)
		t.Logf("ok: %s", string(sres))
	})
}
