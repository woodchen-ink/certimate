import { memo } from "react";
import { useTranslation } from "react-i18next";
import { IconLanguage, type IconProps } from "@tabler/icons-react";
import { Dropdown, type DropdownProps, type MenuProps, Typography } from "antd";

import localeResources from "@/i18n/locales";
import { mergeCls } from "@/utils/css";

export type AppLocaleDropdownProps = {
  children?: React.ReactNode;
  trigger?: DropdownProps["trigger"];
};

const AppLocaleDropdown = (props: AppLocaleDropdownProps) => {
  const { children, trigger = ["click"] } = props;

  const { i18n } = useTranslation();

  const items: Required<MenuProps>["items"] = Object.keys(i18n.store.data).map((key) => {
    return {
      key: key as string,
      label: i18n.store.data[key].name as string,
      onClick: () => {
        if (key !== i18n.language) {
          i18n.changeLanguage(key);
          window.location.reload();
        }
      },
    };
  });

  return (
    <Dropdown menu={{ items }} trigger={trigger}>
      {children}
    </Dropdown>
  );
};

export type AppLocaleIconProps = IconProps;

const AppLocaleIcon = (props: AppLocaleIconProps) => {
  // const { i18n } = useTranslation();

  return <IconLanguage {...props} />;
};

export type AppLocaleLinkButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
};

const AppLocaleLinkButton = (props: AppLocaleLinkButtonProps) => {
  const { className, style, showIcon = true } = props;

  const { t } = useTranslation();
  const { i18n } = useTranslation();

  return (
    <AppLocaleDropdown trigger={["click", "hover"]}>
      <Typography.Text className={mergeCls("cursor-pointer", className)} style={style} type="secondary">
        <div className="flex items-center justify-center space-x-1">
          {showIcon ? <AppLocaleIcon size={16} /> : <></>}
          <span>{String(localeResources[i18n.language]?.name ?? t("common.menu.locale"))}</span>
        </div>
      </Typography.Text>
    </AppLocaleDropdown>
  );
};

export default {
  Dropdown: memo(AppLocaleDropdown),
  Icon: memo(AppLocaleIcon),
  LinkButton: memo(AppLocaleLinkButton),
};
