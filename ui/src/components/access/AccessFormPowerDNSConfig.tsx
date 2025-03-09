import { useTranslation } from "react-i18next";
import { Form, type FormInstance, Input } from "antd";
import { createSchemaFieldRule } from "antd-zod";
import { z } from "zod";

import { type AccessConfigForPowerDNS } from "@/domain/access";

type AccessFormPowerDNSConfigFieldValues = Nullish<AccessConfigForPowerDNS>;

export type AccessFormPowerDNSConfigProps = {
  form: FormInstance;
  formName: string;
  disabled?: boolean;
  initialValues?: AccessFormPowerDNSConfigFieldValues;
  onValuesChange?: (values: AccessFormPowerDNSConfigFieldValues) => void;
};

const initFormModel = (): AccessFormPowerDNSConfigFieldValues => {
  return {
    apiUrl: "http://<your-host-addr>:8082/",
    apiKey: "",
  };
};

const AccessFormPowerDNSConfig = ({ form: formInst, formName, disabled, initialValues, onValuesChange }: AccessFormPowerDNSConfigProps) => {
  const { t } = useTranslation();

  const formSchema = z.object({
    apiUrl: z.string().url(t("common.errmsg.url_invalid")),
    apiKey: z
      .string()
      .min(1, t("access.form.powerdns_api_key.placeholder"))
      .max(64, t("common.errmsg.string_max", { max: 64 }))
      .trim(),
  });
  const formRule = createSchemaFieldRule(formSchema);

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
      <Form.Item
        name="apiUrl"
        label={t("access.form.powerdns_api_url.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("access.form.powerdns_api_url.tooltip") }}></span>}
      >
        <Input placeholder={t("access.form.powerdns_api_url.placeholder")} />
      </Form.Item>

      <Form.Item
        name="apiKey"
        label={t("access.form.powerdns_api_key.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("access.form.powerdns_api_key.tooltip") }}></span>}
      >
        <Input.Password autoComplete="new-password" placeholder={t("access.form.powerdns_api_key.placeholder")} />
      </Form.Item>
    </Form>
  );
};

export default AccessFormPowerDNSConfig;
