import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Select, type SelectProps, Space, Typography } from "antd";

import { type NotificationProvider, notificationProvidersMap } from "@/domain/provider";

export type NotificationProviderSelectProps = Omit<
  SelectProps,
  "filterOption" | "filterSort" | "labelRender" | "options" | "optionFilterProp" | "optionLabelProp" | "optionRender"
> & {
  filter?: (record: NotificationProvider) => boolean;
};

const NotificationProviderSelect = ({ filter, ...props }: NotificationProviderSelectProps) => {
  const { t } = useTranslation();

  const [options, setOptions] = useState<Array<{ key: string; value: string; label: string; data: NotificationProvider }>>([]);
  useEffect(() => {
    const allItems = Array.from(notificationProvidersMap.values());
    const filteredItems = filter != null ? allItems.filter(filter) : allItems;
    setOptions(
      filteredItems.map((item) => ({
        key: item.type,
        value: item.type,
        label: t(item.name),
        data: item,
      }))
    );
  }, [filter]);

  const renderOption = (key: string) => {
    const provider = notificationProvidersMap.get(key);
    return (
      <Space className="max-w-full grow overflow-hidden truncate" size={4}>
        <Avatar src={provider?.icon} size="small" />
        <Typography.Text className="leading-loose" ellipsis>
          {t(provider?.name ?? "")}
        </Typography.Text>
      </Space>
    );
  };

  return (
    <Select
      {...props}
      filterOption={(inputValue, option) => {
        if (!option) return false;

        const value = inputValue.toLowerCase();
        return option.value.toLowerCase().includes(value) || option.label.toLowerCase().includes(value);
      }}
      labelRender={({ label, value }) => {
        if (!label) {
          return <Typography.Text type="secondary">{props.placeholder}</Typography.Text>;
        }

        return renderOption(value as string);
      }}
      options={options}
      optionFilterProp={undefined}
      optionLabelProp={undefined}
      optionRender={(option) => renderOption(option.data.value)}
    />
  );
};

export default memo(NotificationProviderSelect);
