import { memo } from "react";
import { useTranslation } from "react-i18next";
import { IconBook } from "@tabler/icons-react";
import { Typography } from "antd";

export type AppDocumentLinkButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
};

const AppDocumentLinkButton = (props: AppDocumentLinkButtonProps) => {
  const { className, style, showIcon = true } = props;

  const { t } = useTranslation();

  return (
    <Typography.Link className={className} style={style} type="secondary" href="https://docs.certimate.me" target="_blank">
      <div className="flex items-center justify-center space-x-1">
        {showIcon ? <IconBook size={16} /> : <></>}
        <span>{t("common.menu.document")}</span>
      </div>
    </Typography.Link>
  );
};

export default {
  LinkButton: memo(AppDocumentLinkButton),
};
