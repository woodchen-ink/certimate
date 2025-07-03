import { memo } from "react";
import { Badge, Typography } from "antd";

import { version } from "@/domain/version";
import { useVersionChecker } from "@/hooks";

export type AppVersionLinkButtonProps = {
  className?: string;
  style?: React.CSSProperties;
};

const AppVersionLinkButton = ({ className, style }: AppVersionLinkButtonProps) => {
  const { hasNewVersion } = useVersionChecker();

  return (
    <Badge styles={{ indicator: { transform: "scale(0.75) translate(50%, -50%)" } }} count={hasNewVersion ? "NEW" : undefined}>
      <Typography.Link className={className} style={style} type="secondary" href="https://github.com/certimate-go/certimate/releases" target="_blank">
        {version}
      </Typography.Link>
    </Badge>
  );
};

export default {
  LinkButton: memo(AppVersionLinkButton),
};
