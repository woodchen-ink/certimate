package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		tracer := NewTracer("v0.4.0")
		tracer.Printf("go ...")

		// update collection `workflow_logs`
		{
			collection, err := app.FindCollectionByNameOrId("pbc_1682296116")
			if err != nil {
				return err
			}

			field := collection.Fields.GetByName("level")
			if field != nil && field.Type() == "text" {
				// add temp field `levelTmp`
				if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
					"hidden": false,
					"id": "number760395071",
					"max": null,
					"min": null,
					"name": "levelTmp",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				}`)); err != nil {
					return err
				}
				if err := app.Save(collection); err != nil {
					return err
				}

				// copy `level` to `levelTmp`
				if _, err := app.DB().NewQuery("UPDATE workflow_logs SET levelTmp = -4 WHERE level = 'DEBUG'").Execute(); err != nil {
					return err
				}
				if _, err := app.DB().NewQuery("UPDATE workflow_logs SET levelTmp = 4 WHERE level = 'WARN'").Execute(); err != nil {
					return err
				}
				if _, err := app.DB().NewQuery("UPDATE workflow_logs SET levelTmp = 8 WHERE level = 'ERROR'").Execute(); err != nil {
					return err
				}
				if _, err := app.DB().NewQuery("UPDATE workflow_logs SET levelTmp = 0 WHERE levelTmp IS NULL").Execute(); err != nil {
					return err
				}

				// remove old field `level`
				collection.Fields.RemoveById(field.GetId())
				if err := app.Save(collection); err != nil {
					println(err)
					return err
				}

				// rename field `levelTmp` to `level`
				if err := collection.Fields.AddMarshaledJSONAt(6, []byte(`{
					"hidden": false,
					"id": "number760395071",
					"max": null,
					"min": null,
					"name": "level",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				}`)); err != nil {
					return err
				}
				if err := app.Save(collection); err != nil {
					println(err)
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)
			}
		}

		// update collection `access`
		{
			collection, err := app.FindCollectionByNameOrId("4yzbv8urny5ja1e")
			if err != nil {
				return err
			}

			records, err := app.FindAllRecords(collection)
			if err != nil {
				return err
			}

			for _, record := range records {
				changed := false

				provider := record.GetString("provider")
				config := make(map[string]any)
				if err := record.UnmarshalJSONField("config", &config); err != nil {
					return err
				}

				switch provider {
				case "discordbot", "mattermost", "slackbot":
					if _, ok := config["defaultChannelId"]; ok {
						config["channelId"] = config["defaultChannelId"]
						delete(config, "defaultChannelId")
						record.Set("config", config)
						changed = true
					}

				case "email":
					if _, ok := config["defaultSenderAddress"]; ok {
						config["senderAddress"] = config["defaultSenderAddress"]
						delete(config, "defaultSenderAddress")
						record.Set("config", config)
						changed = true
					}
					if _, ok := config["defaultSenderName"]; ok {
						config["senderName"] = config["defaultSenderName"]
						delete(config, "defaultSenderName")
						record.Set("config", config)
						changed = true
					}
					if _, ok := config["defaultReceiverAddress"]; ok {
						config["receiverAddress"] = config["defaultReceiverAddress"]
						delete(config, "defaultReceiverAddress")
						record.Set("config", config)
						changed = true
					}

				case "telegrambot":
					if _, ok := config["defaultChatId"]; ok {
						config["chatId"] = config["defaultChatId"]
						delete(config, "defaultChatId")
						record.Set("config", config)
						changed = true
					}

				case "webhook":
					if _, ok := config["defaultDataForDeployment"]; ok {
						config["dataForDeployment"] = config["defaultDataForDeployment"]
						delete(config, "defaultDataForDeployment")
						record.Set("config", config)
						changed = true
					}
					if _, ok := config["defaultDataForNotification"]; ok {
						config["dataForNotification"] = config["defaultDataForNotification"]
						delete(config, "defaultDataForNotification")
						record.Set("config", config)
						changed = true
					}
				}

				if changed {
					if err := app.Save(record); err != nil {
						return err
					}

					tracer.Printf("record #%s in collection '%s' updated", record.Id, collection.Name)
				}
			}
		}

		tracer.Printf("done")
		return nil
	}, func(app core.App) error {
		return nil
	})
}
