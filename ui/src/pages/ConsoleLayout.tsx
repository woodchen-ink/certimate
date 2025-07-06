import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CloudServerOutlined as CloudServerOutlinedIcon,
  HomeOutlined as HomeOutlinedIcon,
  NodeIndexOutlined as NodeIndexOutlinedIcon,
  SafetyOutlined as SafetyOutlinedIcon,
  SettingOutlined as SettingOutlinedIcon,
} from "@ant-design/icons";
import { IconLogout, IconMenu2 } from "@tabler/icons-react";
import { Alert, Button, Divider, Drawer, Layout, Menu, type MenuProps, Space, Tooltip, theme } from "antd";

import AppDocument from "@/components/AppDocument";
import AppLocale from "@/components/AppLocale";
import AppTheme from "@/components/AppTheme";
import AppVersion from "@/components/AppVersion";
import Show from "@/components/Show";
import { useTriggerElement } from "@/hooks";
import { getAuthStore } from "@/repository/admin";
import { isBrowserHappy } from "@/utils/browser";

const ConsoleLayout = () => {
  const navigate = useNavigate();

  const { t } = useTranslation();

  const { token: themeToken } = theme.useToken();

  const handleLogoutClick = () => {
    auth.clear();
    navigate("/login");
  };

  const auth = getAuthStore();
  if (!auth.isValid || !auth.isSuperuser) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout className="h-screen" hasSider>
      <Layout.Sider className="fixed top-0 left-0 z-20 h-full max-md:static max-md:hidden" width="256px" theme="light">
        <div className="flex size-full flex-col items-center justify-between overflow-hidden">
          <div className="w-full">
            <SiderMenu />
          </div>
          <div className="w-full py-2 text-center">
            <Space align="center" split={<Divider type="vertical" />} size={4}>
              <AppDocument.LinkButton />
              <AppVersion.LinkButton />
            </Space>
          </div>
        </div>
      </Layout.Sider>

      <Layout className="flex flex-col overflow-hidden pl-[256px] max-md:pl-0">
        <Show when={!isBrowserHappy()}>
          <Alert message={t("common.text.happy_browser")} type="warning" showIcon closable />
        </Show>

        <Layout.Header className="shadow-xs" style={{ background: themeToken.colorBgContainer, padding: 0 }}>
          <div className="flex size-full items-center justify-between overflow-hidden px-4">
            <div className="flex items-center gap-4">
              <SiderMenuDrawer trigger={<Button className="md:hidden" icon={<IconMenu2 size={20} stroke="1.25" />} />} />
            </div>
            <div className="flex size-full grow items-center justify-end gap-4 overflow-hidden">
              <AppTheme.Dropdown>
                <Tooltip title={t("common.menu.theme")} mouseEnterDelay={2}>
                  <Button icon={<AppTheme.Icon size={20} stroke="1.25" />} />
                </Tooltip>
              </AppTheme.Dropdown>
              <AppLocale.Dropdown>
                <Tooltip title={t("common.menu.locale")} mouseEnterDelay={2}>
                  <Button icon={<AppLocale.Icon size={20} stroke="1.25" />} />
                </Tooltip>
              </AppLocale.Dropdown>
              <Tooltip title={t("common.menu.logout")} mouseEnterDelay={2}>
                <Button danger icon={<IconLogout size={20} stroke="1.25" />} onClick={handleLogoutClick} />
              </Tooltip>
            </div>
          </div>
        </Layout.Header>

        <Layout.Content className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

const SiderMenu = memo(({ onSelect }: { onSelect?: (key: string) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { t } = useTranslation();

  const MENU_KEY_HOME = "/";
  const MENU_KEY_WORKFLOWS = "/workflows";
  const MENU_KEY_CERTIFICATES = "/certificates";
  const MENU_KEY_ACCESSES = "/accesses";
  const MENU_KEY_SETTINGS = "/settings";
  const menuItems: Required<MenuProps>["items"] = [
    [MENU_KEY_HOME, <HomeOutlinedIcon />, t("dashboard.page.title")],
    [MENU_KEY_WORKFLOWS, <NodeIndexOutlinedIcon />, t("workflow.page.title")],
    [MENU_KEY_CERTIFICATES, <SafetyOutlinedIcon />, t("certificate.page.title")],
    [MENU_KEY_ACCESSES, <CloudServerOutlinedIcon />, t("access.page.title")],
    [MENU_KEY_SETTINGS, <SettingOutlinedIcon />, t("settings.page.title")],
  ].map(([key, icon, label]) => {
    return {
      key: key as string,
      icon: icon,
      label: label,
      onClick: () => {
        navigate(key as string);
        onSelect?.(key as string);
      },
    };
  });
  const [menuSelectedKey, setMenuSelectedKey] = useState<string>();

  const getActiveMenuItem = () => {
    const item =
      menuItems.find((item) => item!.key === location.pathname) ??
      menuItems.find((item) => item!.key !== MENU_KEY_HOME && location.pathname.startsWith(item!.key as string));
    return item;
  };

  useEffect(() => {
    const item = getActiveMenuItem();
    if (item) {
      setMenuSelectedKey(item.key as string);
    } else {
      setMenuSelectedKey(undefined);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (menuSelectedKey && menuSelectedKey !== getActiveMenuItem()?.key) {
      navigate(menuSelectedKey);
    }
  }, [menuSelectedKey]);

  return (
    <>
      <div className="flex w-full items-center gap-2 overflow-hidden px-4 font-semibold">
        <img src="/logo.svg" className="size-[36px]" />
        <span className="h-[64px] w-[74px] truncate leading-[64px] dark:text-white">Certimate</span>
      </div>
      <div className="w-full grow overflow-x-hidden overflow-y-auto">
        <Menu
          items={menuItems}
          mode="vertical"
          selectedKeys={menuSelectedKey ? [menuSelectedKey] : []}
          onSelect={({ key }) => {
            setMenuSelectedKey(key);
          }}
        />
      </div>
    </>
  );
});

const SiderMenuDrawer = memo(({ trigger }: { trigger: React.ReactNode }) => {
  const { token: themeToken } = theme.useToken();

  const [siderOpen, setSiderOpen] = useState(false);

  const triggerEl = useTriggerElement(trigger, { onClick: () => setSiderOpen(true) });

  return (
    <>
      {triggerEl}

      <Drawer
        closable={false}
        destroyOnHidden
        open={siderOpen}
        placement="left"
        styles={{
          content: { paddingTop: themeToken.paddingSM, paddingBottom: themeToken.paddingSM },
          body: { padding: 0 },
        }}
        onClose={() => setSiderOpen(false)}
      >
        <SiderMenu onSelect={() => setSiderOpen(false)} />
      </Drawer>
    </>
  );
});

export default ConsoleLayout;
