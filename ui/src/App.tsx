import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { App, ConfigProvider, type ThemeConfig, theme } from "antd";
import { type Locale } from "antd/es/locale";
import AntdLocaleEnUs from "antd/locale/en_US";
import AntdLocaleZhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

import { useBrowserTheme } from "@/hooks";
import { localeNames } from "@/i18n";
import { router } from "@/router.tsx";

const antdLocalesMap: Record<string, Locale> = {
  [localeNames.ZH]: AntdLocaleZhCN,
  [localeNames.EN]: AntdLocaleEnUs,
};
const antdThemesMap: Record<string, ThemeConfig> = {
  ["light"]: { algorithm: theme.defaultAlgorithm },
  ["dark"]: { algorithm: theme.darkAlgorithm },
};

const RootApp = () => {
  const { i18n } = useTranslation();

  const { theme: browserTheme } = useBrowserTheme();

  const [antdLocale, setAntdLocale] = useState(antdLocalesMap[i18n.language]);
  const [antdTheme, setAntdTheme] = useState(antdThemesMap[browserTheme]);

  const handleLanguageChanged = () => {
    setAntdLocale(antdLocalesMap[i18n.language]);
    dayjs.locale(i18n.language);
  };

  i18n.on("languageChanged", handleLanguageChanged);
  useLayoutEffect(() => {
    handleLanguageChanged();

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  useEffect(() => {
    setAntdTheme(antdThemesMap[browserTheme]);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(browserTheme);
  }, [browserTheme]);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        ...antdTheme,
        token: {
          /* @see global.css */
          colorPrimary: browserTheme === "dark" ? "hsl(20.5 90.2% 48.2%)" : "hsl(24.6 95% 53.1%)",
          colorLink: browserTheme === "dark" ? "hsl(20.5 90.2% 48.2%)" : "hsl(24.6 95% 53.1%)",
        },
      }}
    >
      <App>
        <RouterProvider router={router} />
      </App>
    </ConfigProvider>
  );
};

export default RootApp;
