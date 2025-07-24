import { useState } from "react";
import { useControllableValue } from "ahooks";
import { Drawer } from "antd";

import Show from "@/components/Show";
import { type WorkflowRunModel } from "@/domain/workflowRun";
import { useTriggerElement } from "@/hooks";

import WorkflowRunDetail from "./WorkflowRunDetail";

export interface WorkflowRunDetailDrawerProps {
  data?: WorkflowRunModel;
  loading?: boolean;
  open?: boolean;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const WorkflowRunDetailDrawer = ({ data, loading, trigger, ...props }: WorkflowRunDetailDrawerProps) => {
  const [open, setOpen] = useControllableValue<boolean>(props, {
    valuePropName: "open",
    defaultValuePropName: "defaultOpen",
    trigger: "onOpenChange",
  });

  const triggerEl = useTriggerElement(trigger, { onClick: () => setOpen(true) });

  return (
    <>
      {triggerEl}

      <Drawer
        afterOpenChange={setOpen}
        destroyOnHidden
        open={open}
        loading={loading}
        placement="right"
        title={`WorkflowRun #${data?.id}`}
        width={720}
        onClose={() => setOpen(false)}
      >
        <Show when={!!data}>
          <WorkflowRunDetail data={data!} />
        </Show>
      </Drawer>
    </>
  );
};

const useProps = () => {
  const [data, setData] = useState<WorkflowRunDetailDrawerProps["data"]>();
  const [open, setOpen] = useState<boolean>(false);

  const onOpenChange = (open: boolean) => {
    setOpen(open);

    if (!open) {
      setData(undefined);
    }
  };

  return {
    data,
    open,
    setData,
    setOpen,
    onOpenChange,
  };
};

const _default = Object.assign(WorkflowRunDetailDrawer, {
  useProps,
});

export default _default;
