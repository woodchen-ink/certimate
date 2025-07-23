package logging

import (
	"log/slog"
	"time"

	types "github.com/pocketbase/pocketbase/tools/types"
)

type Record struct {
	Time    time.Time
	Level   slog.Level
	Message string
	Data    types.JSONMap[any]
}
