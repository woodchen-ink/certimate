import { IconCircleCheck, IconCircleDashed, IconCircleOff, IconCircleX, IconClock, IconLoader3 } from "@tabler/icons-react";
import { theme } from "antd";

import { WORKFLOW_RUN_STATUSES } from "@/domain/workflowRun";
import { mergeCls } from "@/utils/css";

export interface WorkflowStatusIconProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string | true;
  size?: number | string;
  status: string;
}

const WorkflowStatusIcon = ({ className, style, color, status, ...props }: WorkflowStatusIconProps) => {
  const { size = "1em" } = props;

  const { token: themeToken } = theme.useToken();

  switch (status) {
    case WORKFLOW_RUN_STATUSES.PENDING:
      if (color === true) {
        color = themeToken.colorTextSecondary;
      }
      return (
        <span className={mergeCls("anticon", className)} style={style} role="img">
          <IconClock color={color} size={size} />
        </span>
      );
    case WORKFLOW_RUN_STATUSES.RUNNING:
      if (color === true) {
        color = themeToken.colorInfo;
      }
      return (
        <span className={mergeCls("anticon", "animate-spin", className)} style={style} role="img">
          <IconLoader3 color={color} size={size} />
        </span>
      );
    case WORKFLOW_RUN_STATUSES.SUCCEEDED:
      if (color === true) {
        color = themeToken.colorSuccess;
      }
      return (
        <span className={mergeCls("anticon", className)} style={style} role="img">
          <IconCircleCheck color={color} size={size} />
        </span>
      );
    case WORKFLOW_RUN_STATUSES.FAILED:
      if (color === true) {
        color = themeToken.colorError;
      }
      return (
        <span className={mergeCls("anticon", className)} style={style} role="img">
          <IconCircleX color={color} size={size} />
        </span>
      );
    case WORKFLOW_RUN_STATUSES.CANCELED:
      if (color === true) {
        color = themeToken.colorWarning;
      }
      return (
        <span className={mergeCls("anticon", className)} style={style} role="img">
          <IconCircleOff color={color} size={size} />
        </span>
      );
    default:
      if (color === true) {
        color = themeToken.colorTextSecondary;
      }
      return (
        <span className={mergeCls("anticon", className)} style={style} role="img">
          <IconCircleDashed color={color} size={size} />
        </span>
      );
  }
};

export default WorkflowStatusIcon;
