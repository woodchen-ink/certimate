package domain

const CollectionNameSettings = "settings"

type Settings struct {
	Meta
	Name    string `json:"name" db:"name"`
	Content string `json:"content" db:"content"`
}

type SettingsContentAsPersistence struct {
	WorkflowRunsMaxDaysRetention        int `json:"workflowRunsMaxDaysRetention"`
	ExpiredCertificatesMaxDaysRetention int `json:"expiredCertificatesMaxDaysRetention"`
}
