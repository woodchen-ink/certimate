﻿package webhook_test

import (
	"context"
	"flag"
	"fmt"
	"strings"
	"testing"

	provider "github.com/usual2970/certimate/internal/pkg/core/notifier/providers/webhook"
)

const (
	mockSubject = "test_subject"
	mockMessage = "test_message"
)

var fUrl string

func init() {
	argsPrefix := "CERTIMATE_NOTIFIER_WEBHOOK_"

	flag.StringVar(&fUrl, argsPrefix+"URL", "", "")
}

/*
Shell command to run this test:

	go test -v ./webhook_test.go -args \
	--CERTIMATE_NOTIFIER_WEBHOOK_URL="https://example.com/your-webhook-url"
*/
func TestNotify(t *testing.T) {
	flag.Parse()

	t.Run("Notify", func(t *testing.T) {
		t.Log(strings.Join([]string{
			"args:",
			fmt.Sprintf("URL: %v", fUrl),
		}, "\n"))

		notifier, err := provider.NewNotifier(&provider.NotifierConfig{
			Url:                      fUrl,
			AllowInsecureConnections: true,
		})
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		res, err := notifier.Notify(context.Background(), mockSubject, mockMessage)
		if err != nil {
			t.Errorf("err: %+v", err)
			return
		}

		t.Logf("ok: %v", res)
	})
}
