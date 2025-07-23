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

		tracer.Printf("done")
		return nil
	}, func(app core.App) error {
		return nil
	})
}
