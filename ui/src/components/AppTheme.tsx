import { memo } from "react";
import { useTranslation } from "react-i18next";
import { IconMoon, type IconProps, IconSun, IconSunMoon } from "@tabler/icons-react";

import { Dropdown, type DropdownProps, type MenuProps, Typography } from "antd";

import { useBrowserTheme } from "@/hooks";
import { mergeCls } from "@/utils/css";

export type AppThemeDropdownProps = {
  children?: React.ReactNode;
  trigger?: DropdownProps["trigger"];
};

const AppThemeDropdown = (props: AppThemeDropdownProps) => {
  const { children, trigger = ["click"] } = props;

  const { t } = useTranslation();

  const { themeMode, setThemeMode } = useBrowserTheme();

  const items: Required<MenuProps>["items"] = [
    ["light", t("common.theme.light"), <IconSun size={16} />],
    ["dark", t("common.theme.dark"), <IconMoon size={16} />],
    ["system", t("common.theme.system"), <IconSunMoon size={16} />],
  ].map(([key, label, icon]) => {
    return {
      key: key as string,
      label: label as string,
      icon: icon as React.ReactElement,
      onClick: () => {
        if (key !== themeMode) {
          setThemeMode(key as Parameters<typeof setThemeMode>[0]);
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

export type AppThemeIconProps = IconProps;

const AppThemeIcon = (props: AppThemeIconProps) => {
  const { theme } = useBrowserTheme();

  return theme === "dark" ? <IconMoon {...props} /> : <IconSun {...props} />;
};

export type AppThemeLinkButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
};

const AppThemeLinkButton = (props: AppThemeLinkButtonProps) => {
  const { className, style, showIcon = true } = props;

  const { t } = useTranslation();

  const { themeMode } = useBrowserTheme();

  return (
    <AppThemeDropdown trigger={["click", "hover"]}>
      <Typography.Text className={mergeCls("cursor-pointer", className)} style={style} type="secondary">
        <div className="flex items-center justify-center space-x-1">
          {showIcon ? <AppThemeIcon size={16} /> : <></>}
          <span>{t(`common.theme.${themeMode}`)}</span>
        </div>
      </Typography.Text>
    </AppThemeDropdown>
  );
};

export default {
  Dropdown: memo(AppThemeDropdown),
  Icon: memo(AppThemeIcon),
  LinkButton: memo(AppThemeLinkButton),
};
