import { createHashRouter } from "react-router-dom";

import AccessList from "./pages/accesses/AccessList";
import AuthLayout from "./pages/AuthLayout";
import CertificateList from "./pages/certificates/CertificateList";
import ConsoleLayout from "./pages/ConsoleLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import Login from "./pages/login/Login";
import Settings from "./pages/settings/Settings";
import SettingsAccount from "./pages/settings/SettingsAccount";
import SettingsNotification from "./pages/settings/SettingsNotification";
import SettingsPassword from "./pages/settings/SettingsPassword";
import SettingsPersistence from "./pages/settings/SettingsPersistence";
import SettingsSSLProvider from "./pages/settings/SettingsSSLProvider";
import WorkflowDetail from "./pages/workflows/WorkflowDetail";
import WorkflowList from "./pages/workflows/WorkflowList";
import WorkflowNew from "./pages/workflows/WorkflowNew";

export const router = createHashRouter([
  {
    path: "/",
    element: <ConsoleLayout />,
    children: [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "/accesses",
        element: <AccessList />,
      },
      {
        path: "/certificates",
        element: <CertificateList />,
      },
      {
        path: "/workflows",
        element: <WorkflowList />,
      },
      {
        path: "/workflows/new",
        element: <WorkflowNew />,
      },
      {
        path: "/workflows/:id",
        element: <WorkflowDetail />,
      },
      {
        path: "/settings",
        element: <Settings />,
        children: [
          {
            path: "/settings/account",
            element: <SettingsAccount />,
          },
          {
            path: "/settings/password",
            element: <SettingsPassword />,
          },
          {
            path: "/settings/notification",
            element: <SettingsNotification />,
          },
          {
            path: "/settings/ssl-provider",
            element: <SettingsSSLProvider />,
          },
          {
            path: "/settings/persistence",
            element: <SettingsPersistence />,
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
    ],
  },
]);
