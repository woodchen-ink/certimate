import { memo } from "react";
import { IconTrashX } from "@tabler/icons-react";
import { Alert, Button, Card } from "antd";

import { useZustandShallowSelector } from "@/hooks";
import { useWorkflowStore } from "@/stores/workflow";

import { type SharedNodeProps } from "./_SharedNode";
import AddNode from "./AddNode";

export interface MonitorNodeProps extends SharedNodeProps {}

const UnknownNode = ({ node, disabled }: MonitorNodeProps) => {
  const { removeNode } = useWorkflowStore(useZustandShallowSelector(["removeNode"]));

  const handleClickRemove = () => {
    removeNode(node);
  };

  return (
    <>
      <div className="relative w-[256px] overflow-hidden">
        <Card className="shadow" styles={{ body: { padding: 0 } }} hoverable variant="borderless">
          <div className="cursor-pointer">
            <Alert
              type="error"
              message={
                <div className="flex items-center justify-between gap-4 overflow-hidden">
                  <div className="flex-1 text-center text-xs">
                    INVALID NODE
                    <br />
                    PLEASE REMOVE
                  </div>
                  <Button color="primary" icon={<IconTrashX size="1.25em" />} variant="text" onClick={handleClickRemove} />
                </div>
              }
            />
          </div>
        </Card>
      </div>

      <AddNode node={node} disabled={disabled} />
    </>
  );
};

export default memo(UnknownNode);
