﻿import { type ChangeEvent, useEffect } from "react";
import { FormOutlined as FormOutlinedIcon } from "@ant-design/icons";
import { nanoid } from "@ant-design/pro-components";
import { useControllableValue } from "ahooks";
import { Button, Form, Input, type InputProps, Space } from "antd";

import { useAntdForm } from "@/hooks";
import ModalForm from "./ModalForm";
import MultipleInput from "./MultipleInput";

type SplitOptions = {
  removeEmpty?: boolean;
  trim?: boolean;
};

export type MultipleSplitValueInputProps = Omit<InputProps, "count" | "defaultValue" | "showCount" | "value" | "onChange"> & {
  defaultValue?: string;
  delimiter?: string;
  maxCount?: number;
  minCount?: number;
  modalTitle?: string;
  modalWidth?: number;
  placeholderInModal?: string;
  showSortButton?: boolean;
  splitOptions?: SplitOptions;
  value?: string[];
  onChange?: (value: string) => void;
};

const DEFAULT_DELIMITER = ";";

const MultipleSplitValueInput = ({
  className,
  style,
  delimiter = DEFAULT_DELIMITER,
  disabled,
  maxCount,
  minCount,
  modalTitle,
  modalWidth = 480,
  placeholder,
  placeholderInModal,
  showSortButton = true,
  splitOptions = {},
  onClear,
  ...props
}: MultipleSplitValueInputProps) => {
  const [value, setValue] = useControllableValue<string>(props, {
    valuePropName: "value",
    defaultValuePropName: "defaultValue",
    trigger: "onChange",
  });

  const { form: formInst, formProps } = useAntdForm({
    name: "componentMultipleSplitValueInput_" + nanoid(),
    initialValues: { value: value?.split(delimiter) },
    onSubmit: (values) => {
      const temp = values.value ?? [];
      if (splitOptions.trim) {
        temp.map((e) => e.trim());
      }
      if (splitOptions.removeEmpty) {
        temp.filter((e) => !!e);
      }

      setValue(temp.join(delimiter));
    },
  });

  useEffect(() => {
    formInst.setFieldValue("value", value?.split(delimiter));
  }, [delimiter, value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue("");
    onClear?.();
  };

  return (
    <Space.Compact className={className} style={{ width: "100%", ...style }}>
      <Input {...props} disabled={disabled} placeholder={placeholder} value={value} onChange={handleChange} onClear={handleClear} />
      <ModalForm
        {...formProps}
        layout="vertical"
        form={formInst}
        modalProps={{ destroyOnHidden: true }}
        title={modalTitle}
        trigger={
          <Button disabled={disabled}>
            <FormOutlinedIcon />
          </Button>
        }
        validateTrigger="onSubmit"
        width={modalWidth}
      >
        <Form.Item name="value" noStyle>
          <MultipleInput minCount={minCount} maxCount={maxCount} placeholder={placeholderInModal ?? placeholder} showSortButton={showSortButton} />
        </Form.Item>
      </ModalForm>
    </Space.Compact>
  );
};

export default MultipleSplitValueInput;
