import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useControllableValue } from "ahooks";
import { App, Button, Drawer, Space } from "antd";

import { type AccessModel } from "@/domain/access";
import { useTriggerElement, useZustandShallowSelector } from "@/hooks";
import { useAccessesStore } from "@/stores/access";
import { getErrMsg } from "@/utils/error";

import AccessForm, { type AccessFormInstance, type AccessFormProps } from "./AccessForm";

export type AccessEditDrawerProps = {
  action: AccessFormProps["action"];
  data?: AccessFormProps["initialValues"];
  loading?: boolean;
  open?: boolean;
  trigger?: React.ReactNode;
  usage?: AccessFormProps["usage"];
  onOpenChange?: (open: boolean) => void;
  afterSubmit?: (record: AccessModel) => void;
};

const AccessEditDrawer = ({ action, data, loading, trigger, usage, afterSubmit, ...props }: AccessEditDrawerProps) => {
  const { t } = useTranslation();

  const { notification } = App.useApp();

  const { createAccess, updateAccess } = useAccessesStore(useZustandShallowSelector(["createAccess", "updateAccess"]));

  const [open, setOpen] = useControllableValue<boolean>(props, {
    valuePropName: "open",
    defaultValuePropName: "defaultOpen",
    trigger: "onOpenChange",
  });

  const triggerEl = useTriggerElement(trigger, { onClick: () => setOpen(true) });

  const formRef = useRef<AccessFormInstance>(null);
  const [formPending, setFormPending] = useState(false);

  const handleOkClick = async () => {
    setFormPending(true);
    try {
      await formRef.current!.validateFields();
    } catch (err) {
      setFormPending(false);
      throw err;
    }

    try {
      let values: AccessModel = formRef.current!.getFieldsValue();

      if (action === "create") {
        if (data?.id) {
          throw "Invalid props: `data`";
        }

        values = await createAccess(values);
      } else if (action === "edit") {
        if (!data?.id) {
          throw "Invalid props: `data`";
        }

        values = await updateAccess({ ...data, ...values });
      } else {
        throw "Invalid props: `action`";
      }

      afterSubmit?.(values);
      setOpen(false);
    } catch (err) {
      notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });

      throw err;
    } finally {
      setFormPending(false);
    }
  };

  const handleCancelClick = () => {
    if (formPending) return;

    setOpen(false);
  };

  return (
    <>
      {triggerEl}

      <Drawer
        afterOpenChange={setOpen}
        closable={!formPending}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end">
            <Button onClick={handleCancelClick}>{t("common.button.cancel")}</Button>
            <Button loading={formPending} type="primary" onClick={handleOkClick}>
              {action === "edit" ? t("common.button.save") : t("common.button.submit")}
            </Button>
          </Space>
        }
        loading={loading}
        maskClosable={!formPending}
        open={open}
        title={t(`access.action.${action}.modal.title`)}
        width={720}
        onClose={() => setOpen(false)}
      >
        <AccessForm ref={formRef} initialValues={data} action={action === "create" ? "create" : "edit"} usage={usage} />
      </Drawer>
    </>
  );
};

export default AccessEditDrawer;
