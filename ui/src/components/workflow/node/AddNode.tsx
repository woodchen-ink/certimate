import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconCloudUpload, IconContract, IconDeviceDesktopSearch, IconPackage, IconPlus, IconSend, IconSitemap } from "@tabler/icons-react";
import { Dropdown } from "antd";

import { WorkflowNodeType, newNode } from "@/domain/workflow";
import { useZustandShallowSelector } from "@/hooks";
import { useWorkflowStore } from "@/stores/workflow";

import { type SharedNodeProps } from "./_SharedNode";

export interface AddNodeProps extends SharedNodeProps {}

const AddNode = ({ node, disabled }: AddNodeProps) => {
  const { t } = useTranslation();

  const { addNode } = useWorkflowStore(useZustandShallowSelector(["addNode"]));

  const dropdownMenus = useMemo(() => {
    return (
      [
        [WorkflowNodeType.Apply, "workflow_node.apply.label", <IconContract size="1em" />],
        [WorkflowNodeType.Upload, "workflow_node.upload.label", <IconCloudUpload size="1em" />],
        [WorkflowNodeType.Monitor, "workflow_node.monitor.label", <IconDeviceDesktopSearch size="1em" />],
        [WorkflowNodeType.Deploy, "workflow_node.deploy.label", <IconPackage size="1em" />],
        [WorkflowNodeType.Notify, "workflow_node.notify.label", <IconSend size="1em" />],
        [WorkflowNodeType.Branch, "workflow_node.branch.label", <IconSitemap size="1em" />],
        [WorkflowNodeType.ExecuteResultBranch, "workflow_node.execute_result_branch.label", <IconSitemap size="1em" />],
      ] satisfies Array<[WorkflowNodeType, string, React.ReactNode]>
    )
      .filter(([type]) => {
        const hasExecuteResult = [
          WorkflowNodeType.Apply,
          WorkflowNodeType.Upload,
          WorkflowNodeType.Monitor,
          WorkflowNodeType.Deploy,
          WorkflowNodeType.Notify,
        ].includes(node.type);
        if (!hasExecuteResult) {
          return type !== WorkflowNodeType.ExecuteResultBranch;
        }

        return true;
      })
      .map(([type, label, icon]) => {
        return {
          key: type,
          disabled: disabled,
          label: t(label),
          icon: (
            <span className="anticon scale-125" role="img">
              {icon}
            </span>
          ),
          onClick: () => {
            const nextNode = newNode(type);
            addNode(nextNode, node.id);
          },
        };
      });
  }, [node.id, node.type, disabled]);

  return (
    <div className="relative py-6 before:absolute before:top-0 before:left-1/2 before:h-full before:w-[2px] before:-translate-x-1/2 before:bg-stone-200 before:content-['']">
      <Dropdown menu={{ items: dropdownMenus }} trigger={["click"]}>
        <div className="relative z-1 flex size-5 cursor-pointer items-center justify-center rounded-full bg-stone-400 text-white hover:bg-stone-500">
          <IconPlus size="1em" />
        </div>
      </Dropdown>
    </div>
  );
};

export default memo(AddNode);
