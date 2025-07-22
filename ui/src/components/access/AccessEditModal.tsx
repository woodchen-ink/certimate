import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useControllableValue } from "ahooks";
import { App, Modal } from "antd";

import { type AccessModel } from "@/domain/access";
import { useTriggerElement, useZustandShallowSelector } from "@/hooks";
import { useAccessesStore } from "@/stores/access";
import { getErrMsg } from "@/utils/error";

import AccessForm, { type AccessFormInstance, type AccessFormProps } from "./AccessForm";

export interface AccessEditModalProps {
  action: AccessFormProps["action"];
  data?: AccessFormProps["initialValues"];
  loading?: boolean;
  open?: boolean;
  usage?: AccessFormProps["usage"];
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  afterSubmit?: (record: AccessModel) => void;
}

const AccessEditModal = ({ action, data, loading, trigger, usage, afterSubmit, ...props }: AccessEditModalProps) => {
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

  const [footerShow, setFooterShow] = useState(!!data?.provider);
  useEffect(() => {
    setFooterShow(!!data?.provider);
  }, [data?.provider]);

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

  const handleFormValuesChange: AccessFormProps["onValuesChange"] = (values) => {
    setFooterShow(!!values.provider);
  };

  return (
    <>
      {triggerEl}

      <Modal
        styles={{
          body: {
            maxHeight: "calc(80vh - 64px)",
            paddingTop: "1em",
            paddingBottom: "1em",
            overflowX: "hidden",
            overflowY: "auto",
          },
        }}
        afterClose={() => setOpen(false)}
        cancelButtonProps={{ disabled: formPending }}
        cancelText={t("common.button.cancel")}
        closable
        confirmLoading={formPending}
        destroyOnHidden
        footer={footerShow ? undefined : false}
        loading={loading}
        okText={action === "edit" ? t("common.button.save") : t("common.button.submit")}
        open={open}
        title={t(`access.action.${action}.modal.title`)}
        width={480}
        onOk={handleOkClick}
        onCancel={handleCancelClick}
      >
        <AccessForm ref={formRef} initialValues={data} action={action === "create" ? "create" : "edit"} usage={usage} onValuesChange={handleFormValuesChange} />
      </Modal>
    </>
  );
};

export default AccessEditModal;
