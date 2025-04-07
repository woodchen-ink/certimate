import { useTranslation } from "react-i18next";
import { Form, type FormInstance, Input, Select } from "antd";
import { createSchemaFieldRule } from "antd-zod";
import { z } from "zod";

import Show from "@/components/Show";

type DeployNodeConfigFormSafeLineConfigFieldValues = Nullish<{
  resourceType: string;
  certificateId?: string | number;
}>;

export type DeployNodeConfigFormSafeLineConfigProps = {
  form: FormInstance;
  formName: string;
  disabled?: boolean;
  initialValues?: DeployNodeConfigFormSafeLineConfigFieldValues;
  onValuesChange?: (values: DeployNodeConfigFormSafeLineConfigFieldValues) => void;
};

const RESOURCE_TYPE_CERTIFICATE = "certificate" as const;

const initFormModel = (): DeployNodeConfigFormSafeLineConfigFieldValues => {
  return {
    resourceType: RESOURCE_TYPE_CERTIFICATE,
    certificateId: "",
  };
};

const DeployNodeConfigFormSafeLineConfig = ({ form: formInst, formName, disabled, initialValues, onValuesChange }: DeployNodeConfigFormSafeLineConfigProps) => {
  const { t } = useTranslation();

  const formSchema = z.object({
    resourceType: z.literal(RESOURCE_TYPE_CERTIFICATE, {
      message: t("workflow_node.deploy.form.safeline_resource_type.placeholder"),
    }),
    certificateId: z
      .union([z.string(), z.number().int()])
      .nullish()
      .refine((v) => {
        if (fieldResourceType !== RESOURCE_TYPE_CERTIFICATE) return true;
        return /^\d+$/.test(v + "") && +v! > 0;
      }, t("workflow_node.deploy.form.safeline_certificate_id.placeholder")),
  });
  const formRule = createSchemaFieldRule(formSchema);

  const fieldResourceType = Form.useWatch("resourceType", formInst);

  const handleFormChange = (_: unknown, values: z.infer<typeof formSchema>) => {
    onValuesChange?.(values);
  };

  return (
    <Form
      form={formInst}
      disabled={disabled}
      initialValues={initialValues ?? initFormModel()}
      layout="vertical"
      name={formName}
      onValuesChange={handleFormChange}
    >
      <Form.Item name="resourceType" label={t("workflow_node.deploy.form.safeline_resource_type.label")} rules={[formRule]}>
        <Select placeholder={t("workflow_node.deploy.form.safeline_resource_type.placeholder")}>
          <Select.Option key={RESOURCE_TYPE_CERTIFICATE} value={RESOURCE_TYPE_CERTIFICATE}>
            {t("workflow_node.deploy.form.safeline_resource_type.option.certificate.label")}
          </Select.Option>
        </Select>
      </Form.Item>

      <Show when={fieldResourceType === RESOURCE_TYPE_CERTIFICATE}>
        <Form.Item name="certificateId" label={t("workflow_node.deploy.form.safeline_certificate_id.label")} rules={[formRule]}>
          <Input type="number" placeholder={t("workflow_node.deploy.form.safeline_certificate_id.placeholder")} />
        </Form.Item>
      </Show>
    </Form>
  );
};

export default DeployNodeConfigFormSafeLineConfig;
