import { memo } from "react";
import { theme } from "antd";

import { type WorkflowNode } from "@/domain/workflow";

import AddNode from "./AddNode";
import WorkflowElement from "../WorkflowElement";
import { type SharedNodeProps } from "./_SharedNode";

export type BrandNodeProps = SharedNodeProps;

const ExecuteResultBranchNode = ({ node, disabled }: BrandNodeProps) => {
  const { token: themeToken } = theme.useToken();

  const renderBranch = (node: WorkflowNode, branchNodeId?: string, branchIndex?: number) => {
    const elements: JSX.Element[] = [];

    let current = node as typeof node | undefined;
    while (current) {
      elements.push(<WorkflowElement key={current.id} node={current} disabled={disabled} branchId={branchNodeId} branchIndex={branchIndex} />);
      current = current.next;
    }

    return elements;
  };

  return (
    <>
      <div
        className="relative flex gap-x-16 before:absolute before:inset-x-[128px] before:top-0 before:h-[2px] before:bg-stone-200 before:content-[''] after:absolute after:inset-x-[128px] after:bottom-0 after:h-[2px] after:bg-stone-200 after:content-['']"
        style={{
          backgroundColor: themeToken.colorBgContainer,
        }}
      >
        {node.branches?.map((branch, index) => (
          <div
            key={branch.id}
            className="relative flex flex-col items-center before:absolute  before:left-1/2 before:top-0 before:h-full before:w-[2px] before:-translate-x-1/2 before:bg-stone-200 before:content-['']"
          >
            {index == 0 && (
              <>
                <div
                  className="absolute -left-px -top-1 h-2 w-1/2"
                  style={{
                    backgroundColor: themeToken.colorBgContainer,
                  }}
                ></div>
                <div
                  className="absolute -bottom-1 -left-px z-50 h-2 w-1/2"
                  style={{
                    backgroundColor: themeToken.colorBgContainer,
                  }}
                ></div>
              </>
            )}
            {node.branches && index == node.branches.length - 1 && (
              <>
                <div
                  className="absolute -right-px -top-1 h-2 w-1/2"
                  style={{
                    backgroundColor: themeToken.colorBgContainer,
                  }}
                ></div>
                <div
                  className="absolute -bottom-1 -right-px z-50 h-2 w-1/2"
                  style={{
                    backgroundColor: themeToken.colorBgContainer,
                  }}
                ></div>
              </>
            )}
            <div className="relative flex flex-col items-center">{renderBranch(branch, node.id, index)}</div>
          </div>
        ))}
      </div>

      <AddNode node={node} disabled={disabled} />
    </>
  );
};

export default memo(ExecuteResultBranchNode);
