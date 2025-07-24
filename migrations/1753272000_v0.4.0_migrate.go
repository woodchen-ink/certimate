package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		tracer := NewTracer("v0.4.0")
		tracer.Printf("go ...")

		// update collection `access`
		{
			collection, err := app.FindCollectionByNameOrId("4yzbv8urny5ja1e")
			if err != nil {
				return err
			} else if collection != nil {
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
		}

		// update collection `certificate`
		{
			collection, err := app.FindCollectionByNameOrId("4szxr9x43tpj6np")
			if err != nil {
				return err
			} else if collection != nil {
				if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
					"hidden": false,
					"id": "by9hetqi",
					"maxSelect": 1,
					"name": "source",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "select",
					"values": [
						"request",
						"upload"
					]
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(9, []byte(`{
					"hidden": false,
					"id": "v40aqzpd",
					"max": "",
					"min": "",
					"name": "validityNotBefore",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "date"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(10, []byte(`{
					"hidden": false,
					"id": "zgpdby2k",
					"max": "",
					"min": "",
					"name": "validityNotAfter",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "date"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(15, []byte(`{
					"cascadeDelete": false,
					"collectionId": "tovyif5ax6j62ur",
					"hidden": false,
					"id": "uvqfamb1",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(16, []byte(`{
					"cascadeDelete": false,
					"collectionId": "qjp8lygssgwyqyz",
					"hidden": false,
					"id": "relation3917999135",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowRunRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(17, []byte(`{
					"cascadeDelete": false,
					"collectionId": "bqnxb95f2cooowp",
					"hidden": false,
					"id": "2ohlr0yd",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowOutputRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := json.Unmarshal([]byte(`{
					"indexes": [
						"CREATE INDEX `+"`"+`idx_Jx8TXzDCmw`+"`"+` ON `+"`"+`certificate`+"`"+` (`+"`"+`workflowRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_2cRXqNDyyp`+"`"+` ON `+"`"+`certificate`+"`"+` (`+"`"+`workflowRunRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_kcKpgAZapk`+"`"+` ON `+"`"+`certificate`+"`"+` (`+"`"+`workflowNodeId`+"`"+`)"
					]
				}`), &collection); err != nil {
					return err
				}

				if err := app.Save(collection); err != nil {
					return err
				}

				if _, err := app.DB().NewQuery("UPDATE certificate SET source = 'request' WHERE source = 'workflow'").Execute(); err != nil {
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)
			}
		}

		// update collection `workflow`
		{
			collection, err := app.FindCollectionByNameOrId("tovyif5ax6j62ur")
			if err != nil {
				return err
			} else if collection != nil {
				if err := collection.Fields.AddMarshaledJSONAt(3, []byte(`{
					"hidden": false,
					"id": "vqoajwjq",
					"maxSelect": 1,
					"name": "trigger",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "select",
					"values": [
						"manual",
						"scheduled"
					]
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(9, []byte(`{
					"cascadeDelete": false,
					"collectionId": "qjp8lygssgwyqyz",
					"hidden": false,
					"id": "a23wkj9x",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "lastRunRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := app.Save(collection); err != nil {
					return err
				}

				if _, err := app.DB().NewQuery("UPDATE workflow SET trigger = 'scheduled' WHERE trigger = 'auto'").Execute(); err != nil {
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)

				records, err := app.FindAllRecords(collection)
				if err != nil {
					return err
				} else {
					for _, record := range records {
						changed := false

						draft := make(map[string]any)
						if err := record.UnmarshalJSONField("draft", &draft); err == nil {
							if _, ok := draft["config"]; ok {
								config := draft["config"].(map[string]any)
								if _, ok := config["trigger"]; ok {
									trigger := config["trigger"].(string)
									if trigger == "auto" {
										config["trigger"] = "scheduled"
										record.Set("draft", draft)
										changed = true
									}
								}
							}
						}

						content := make(map[string]any)
						if err := record.UnmarshalJSONField("content", &content); err == nil {
							if _, ok := content["config"]; ok {
								config := content["config"].(map[string]any)
								if _, ok := config["trigger"]; ok {
									trigger := config["trigger"].(string)
									if trigger == "auto" {
										config["trigger"] = "scheduled"
										record.Set("content", content)
										changed = true
									}
								}
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
			}
		}

		// update collection `workflow_run`
		{
			collection, err := app.FindCollectionByNameOrId("qjp8lygssgwyqyz")
			if err != nil {
				return err
			} else if collection != nil {
				if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
					"cascadeDelete": true,
					"collectionId": "tovyif5ax6j62ur",
					"hidden": false,
					"id": "m8xfsyyy",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(3, []byte(`{
					"hidden": false,
					"id": "jlroa3fk",
					"maxSelect": 1,
					"name": "trigger",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "select",
					"values": [
						"manual",
						"scheduled"
					]
				}`)); err != nil {
					return err
				}

				if err := json.Unmarshal([]byte(`{
					"indexes": [
						"CREATE INDEX `+"`"+`idx_7ZpfjTFsD2`+"`"+` ON `+"`"+`workflow_run`+"`"+` (`+"`"+`workflowRef`+"`"+`)"
					]
				}`), &collection); err != nil {
					return err
				}

				if err := app.Save(collection); err != nil {
					return err
				}

				if _, err := app.DB().NewQuery("UPDATE workflow_run SET trigger = 'scheduled' WHERE trigger = 'auto'").Execute(); err != nil {
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)

				records, err := app.FindAllRecords(collection)
				if err != nil {
					return err
				} else {
					for _, record := range records {
						changed := false

						detail := make(map[string]any)
						if err := record.UnmarshalJSONField("detail", &detail); err == nil {
							if _, ok := detail["config"]; ok {
								config := detail["config"].(map[string]any)
								if _, ok := config["trigger"]; ok {
									trigger := config["trigger"].(string)
									if trigger == "auto" {
										config["trigger"] = "scheduled"
										record.Set("detail", detail)
										changed = true
									}
								}
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
			}
		}

		// update collection `workflow_output`
		{
			collection, err := app.FindCollectionByNameOrId("bqnxb95f2cooowp")
			if err != nil {
				return err
			} else if collection != nil {
				if err := json.Unmarshal([]byte(`{
					"indexes": [
						"CREATE INDEX `+"`"+`idx_BYoQPsz4my`+"`"+` ON `+"`"+`workflow_output`+"`"+` (`+"`"+`workflowRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_O9zxLETuxJ`+"`"+` ON `+"`"+`workflow_output`+"`"+` (`+"`"+`runRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_luac8Ul34G`+"`"+` ON `+"`"+`workflow_output`+"`"+` (`+"`"+`nodeId`+"`"+`)"
					]
				}`), &collection); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
					"cascadeDelete": true,
					"collectionId": "tovyif5ax6j62ur",
					"hidden": false,
					"id": "jka88auc",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
					"cascadeDelete": true,
					"collectionId": "qjp8lygssgwyqyz",
					"hidden": false,
					"id": "relation821863227",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "runRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := app.Save(collection); err != nil {
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)
			}
		}

		// update collection `workflow_logs`
		{
			collection, err := app.FindCollectionByNameOrId("pbc_1682296116")
			if err != nil {
				return err
			} else if collection != nil {
				if field := collection.Fields.GetByName("level"); field != nil && field.Type() == "text" {
					if _, err := app.DB().NewQuery("UPDATE workflow_logs SET level = -4 WHERE level = 'DEBUG'").Execute(); err != nil {
						return err
					}
					if _, err := app.DB().NewQuery("UPDATE workflow_logs SET level = 0 WHERE level = 'INFO'").Execute(); err != nil {
						return err
					}
					if _, err := app.DB().NewQuery("UPDATE workflow_logs SET level = 4 WHERE level = 'WARN'").Execute(); err != nil {
						return err
					}
					if _, err := app.DB().NewQuery("UPDATE workflow_logs SET level = 8 WHERE level = 'ERROR'").Execute(); err != nil {
						return err
					}

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

					collection.Fields.RemoveById(field.GetId())
					if err := app.Save(collection); err != nil {
						return err
					}

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
						return err
					}
				}

				if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
					"cascadeDelete": true,
					"collectionId": "tovyif5ax6j62ur",
					"hidden": false,
					"id": "relation3371272342",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "workflowRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
					"cascadeDelete": true,
					"collectionId": "qjp8lygssgwyqyz",
					"hidden": false,
					"id": "relation821863227",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "runRef",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				}`)); err != nil {
					return err
				}

				if err := json.Unmarshal([]byte(`{
					"indexes": [
						"CREATE INDEX `+"`"+`idx_IOlpy6XuJ2`+"`"+` ON `+"`"+`workflow_logs`+"`"+` (`+"`"+`workflowRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_qVlTb2yl7v`+"`"+` ON `+"`"+`workflow_logs`+"`"+` (`+"`"+`runRef`+"`"+`)",
						"CREATE INDEX `+"`"+`idx_UL4tdCXNlA`+"`"+` ON `+"`"+`workflow_logs`+"`"+` (`+"`"+`nodeId`+"`"+`)"
					]
				}`), &collection); err != nil {
					return err
				}

				if err := app.Save(collection); err != nil {
					return err
				}

				tracer.Printf("collection '%s' updated", collection.Name)
			}
		}

		tracer.Printf("done")
		return nil
	}, func(app core.App) error {
		return nil
	})
}
