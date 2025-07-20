import {
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  ClockCircleOutlined as ClockCircleOutlinedIcon,
  CloseCircleOutlined as CloseCircleOutlinedIcon,
  StopOutlined as StopOutlinedIcon,
  SyncOutlined as SyncOutlinedIcon,
} from "@ant-design/icons";
import { theme } from "antd";

import { WORKFLOW_RUN_STATUSES } from "@/domain/workflowRun";
import { mergeCls } from "@/utils/css";

export type WorkflowStatusIconProps = {
  className?: string;
  style?: React.CSSProperties;
  color?: string | true;
  size?: number | string;
  status: string;
};

const WorkflowStatusIcon = ({ className, style, color, size, status }: WorkflowStatusIconProps) => {
  const { token: themeToken } = theme.useToken();

  switch (status) {
    case WORKFLOW_RUN_STATUSES.PENDING:
      if (color === true) {
        color = themeToken.colorTextSecondary;
      }
      return (
        <ClockCircleOutlinedIcon
          className={className}
          style={{
            ...style,
            color: color,
            fontSize: size,
          }}
        />
      );
    case WORKFLOW_RUN_STATUSES.RUNNING:
      if (color === true) {
        color = themeToken.colorInfo;
      }
      return (
        <SyncOutlinedIcon
          className={mergeCls("animate-spin", className)}
          style={{
            ...style,
            color: color,
            fontSize: size,
          }}
        />
      );
    case WORKFLOW_RUN_STATUSES.SUCCEEDED:
      if (color === true) {
        color = themeToken.colorSuccess;
        console.log(color);
      }
      return (
        <CheckCircleOutlinedIcon
          className={className}
          style={{
            ...style,
            color: color,
            fontSize: size,
          }}
        />
      );
    case WORKFLOW_RUN_STATUSES.FAILED:
      if (color === true) {
        color = themeToken.colorError;
      }
      return (
        <CloseCircleOutlinedIcon
          className={className}
          style={{
            ...style,
            color: color,
            fontSize: size,
          }}
        />
      );
    case WORKFLOW_RUN_STATUSES.CANCELED:
      if (color === true) {
        color = themeToken.colorWarning;
      }
      return (
        <StopOutlinedIcon
          className={className}
          style={{
            ...style,
            color: color,
            fontSize: size,
          }}
        />
      );
    default:
      return <></>;
  }
};

export default WorkflowStatusIcon;
