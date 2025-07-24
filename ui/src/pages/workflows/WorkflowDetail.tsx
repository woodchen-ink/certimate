import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { IconArrowBackUp, IconChevronDown, IconDots, IconHistory, IconPlayerPlay, IconRobot, IconTrash } from "@tabler/icons-react";
import { Alert, App, Button, Card, Dropdown, Flex, Form, Input, Segmented, Space, Tabs } from "antd";
import { createSchemaFieldRule } from "antd-zod";
import { isEqual } from "radash";
import { z } from "zod";

import { startRun as startWorkflowRun } from "@/api/workflows";
import ModalForm from "@/components/ModalForm";
import Show from "@/components/Show";
import WorkflowElementsContainer from "@/components/workflow/WorkflowElementsContainer";
import WorkflowRuns from "@/components/workflow/WorkflowRuns";
import { isAllNodesValidated } from "@/domain/workflow";
import { WORKFLOW_RUN_STATUSES } from "@/domain/workflowRun";
import { useAntdForm, useZustandShallowSelector } from "@/hooks";
import { remove as removeWorkflow, subscribe as subscribeWorkflow, unsubscribe as unsubscribeWorkflow } from "@/repository/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { getErrMsg } from "@/utils/error";

const WorkflowDetail = () => {
  const navigate = useNavigate();

  const { t } = useTranslation();

  const { message, modal, notification } = App.useApp();

  const { id: workflowId } = useParams();
  const { workflow, initialized, ...workflowState } = useWorkflowStore(
    useZustandShallowSelector(["workflow", "initialized", "init", "destroy", "setEnabled", "release", "discard"])
  );
  useEffect(() => {
    workflowState.init(workflowId!);

    return () => {
      workflowState.destroy();
    };
  }, [workflowId]);

  const [tabValue, setTabValue] = useState<"orchestration" | "runs">("orchestration");

  const [isPendingOrRunning, setIsPendingOrRunning] = useState(false);
  const lastRunStatus = useMemo(() => workflow.lastRunStatus, [workflow]);

  const [allowDiscard, setAllowDiscard] = useState(false);
  const [allowRelease, setAllowRelease] = useState(false);
  const [allowRun, setAllowRun] = useState(false);

  useEffect(() => {
    setIsPendingOrRunning(lastRunStatus == WORKFLOW_RUN_STATUSES.PENDING || lastRunStatus == WORKFLOW_RUN_STATUSES.RUNNING);
  }, [lastRunStatus]);

  useEffect(() => {
    if (!!workflowId && isPendingOrRunning) {
      subscribeWorkflow(workflowId, (cb) => {
        if (cb.record.lastRunStatus !== WORKFLOW_RUN_STATUSES.PENDING && cb.record.lastRunStatus !== WORKFLOW_RUN_STATUSES.RUNNING) {
          setIsPendingOrRunning(false);
          unsubscribeWorkflow(workflowId);
        }
      });

      return () => {
        unsubscribeWorkflow(workflowId);
      };
    }
  }, [workflowId, isPendingOrRunning]);

  useEffect(() => {
    const hasReleased = !!workflow.content;
    const hasChanges = workflow.hasDraft! || !isEqual(workflow.draft, workflow.content);
    setAllowDiscard(!isPendingOrRunning && hasReleased && hasChanges);
    setAllowRelease(!isPendingOrRunning && hasChanges);
    setAllowRun(hasReleased);
  }, [workflow.content, workflow.draft, workflow.hasDraft, isPendingOrRunning]);

  const handleEnableChange = async () => {
    if (!workflow.enabled && (!workflow.content || !isAllNodesValidated(workflow.content))) {
      message.warning(t("workflow.action.enable.errmsg.uncompleted"));
      return;
    }

    try {
      await workflowState.setEnabled(!workflow.enabled);
    } catch (err) {
      console.error(err);
      notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
    }
  };

  const handleDeleteClick = () => {
    modal.confirm({
      title: <span className="text-error">{t("workflow.action.delete.modal.title", { name: workflow.name })}</span>,
      content: <span dangerouslySetInnerHTML={{ __html: t("workflow.action.delete.modal.content") }} />,
      icon: (
        <span className="anticon" role="img">
          <IconTrash className="text-error" size="1em" />
        </span>
      ),
      okText: t("common.button.confirm"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const resp = await removeWorkflow(workflow);
          if (resp) {
            navigate("/workflows", { replace: true });
          }
        } catch (err) {
          console.error(err);
          notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
        }
      },
    });
  };

  const handleDiscardClick = () => {
    modal.confirm({
      title: t("workflow.action.discard.modal.title"),
      content: t("workflow.action.discard.modal.content"),
      onOk: async () => {
        try {
          await workflowState.discard();

          message.success(t("common.text.operation_succeeded"));
        } catch (err) {
          console.error(err);
          notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
        }
      },
    });
  };

  const handleReleaseClick = () => {
    if (!isAllNodesValidated(workflow.draft!)) {
      message.warning(t("workflow.action.release.errmsg.uncompleted"));
      return;
    }

    modal.confirm({
      title: t("workflow.action.release.modal.title"),
      content: t("workflow.action.release.modal.content"),
      onOk: async () => {
        try {
          await workflowState.release();

          message.success(t("common.text.operation_succeeded"));
        } catch (err) {
          console.error(err);
          notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
        }
      },
    });
  };

  const handleRunClick = () => {
    const { promise, resolve, reject } = Promise.withResolvers();
    if (workflow.hasDraft) {
      modal.confirm({
        title: t("workflow.action.run.modal.title"),
        content: t("workflow.action.run.modal.content"),
        onOk: () => resolve(void 0),
        onCancel: () => reject(),
      });
    } else {
      resolve(void 0);
    }

    promise.then(async () => {
      let unsubscribeFn: Awaited<ReturnType<typeof subscribeWorkflow>> | undefined = undefined;

      try {
        setIsPendingOrRunning(true);

        // subscribe before running workflow
        unsubscribeFn = await subscribeWorkflow(workflowId!, (e) => {
          if (e.record.lastRunStatus !== WORKFLOW_RUN_STATUSES.PENDING && e.record.lastRunStatus !== WORKFLOW_RUN_STATUSES.RUNNING) {
            setIsPendingOrRunning(false);
            unsubscribeFn?.();
          }
        });

        await startWorkflowRun(workflowId!);

        message.info(t("workflow.action.run.prompt"));
      } catch (err) {
        setIsPendingOrRunning(false);
        unsubscribeFn?.();

        console.error(err);
        message.warning(t("common.text.operation_failed"));
      }
    });
  };

  return (
    <div className="flex size-full flex-col">
      <div className="px-6 py-4">
        <div className="relative mx-auto max-w-320">
          <div className="flex justify-between gap-2">
            <div>
              <h1>{workflow.name || "\u00A0"}</h1>
              <p className="mb-0 text-base text-gray-500">{workflow.description || "\u00A0"}</p>
            </div>
            <Flex className="my-2" gap="small">
              {initialized
                ? [
                    <WorkflowBaseInfoModal key="edit" trigger={<Button>{t("common.button.edit")}</Button>} />,
                    <Button key="enable" onClick={handleEnableChange}>
                      {workflow.enabled ? t("workflow.action.disable.button") : t("workflow.action.enable.button")}
                    </Button>,
                    <Dropdown
                      key="more"
                      menu={{
                        items: [
                          {
                            key: "delete",
                            label: t("common.button.delete"),
                            danger: true,
                            icon: <IconTrash size="1.25em" />,
                            onClick: () => {
                              handleDeleteClick();
                            },
                          },
                        ],
                      }}
                      trigger={["click"]}
                    >
                      <Button icon={<IconChevronDown size="1.25em" />} iconPosition="end">
                        {t("common.button.more")}
                      </Button>
                    </Dropdown>,
                  ]
                : []}
            </Flex>
          </div>

          <div className="absolute -bottom-12 left-1/2 z-1 -translate-x-1/2">
            <Segmented
              className="shadow"
              options={[
                {
                  value: "orchestration",
                  label: <span className="px-2 text-sm">{t("workflow.detail.orchestration.tab")}</span>,
                  icon: (
                    <span className="anticon scale-125" role="img">
                      <IconRobot size="1em" />
                    </span>
                  ),
                },
                {
                  value: "runs",
                  label: <span className="px-2 text-sm">{t("workflow.detail.runs.tab")}</span>,
                  icon: (
                    <span className="anticon scale-125" role="img">
                      <IconHistory size="1em" />
                    </span>
                  ),
                },
              ]}
              size="large"
              value={tabValue}
              defaultValue="orchestration"
              onChange={(value) => {
                setTabValue(value as typeof tabValue);
              }}
            />
          </div>
        </div>
      </div>

      <Show when={tabValue === "orchestration"}>
        <div className="min-h-[360px] flex-1 overflow-hidden p-4">
          <Card
            className="size-full overflow-hidden"
            styles={{
              body: {
                position: "relative",
                height: "100%",
                padding: initialized ? 0 : undefined,
              },
            }}
            loading={!initialized}
          >
            <div className="absolute inset-x-6 top-4 z-2 mx-auto flex max-w-320 items-center justify-between gap-4 pt-6">
              <div className="flex-1 overflow-hidden">
                <Show when={workflow.hasDraft!}>
                  <Alert message={<div className="truncate">{t("workflow.detail.orchestration.draft.alert")}</div>} showIcon type="warning" />
                </Show>
              </div>
              <div className="flex justify-end">
                <Space>
                  <Button disabled={!allowRun} icon={<IconPlayerPlay size="1.25em" />} loading={isPendingOrRunning} type="primary" onClick={handleRunClick}>
                    {t("workflow.action.run.button")}
                  </Button>
                  <Space.Compact>
                    <Button color="primary" disabled={!allowRelease} variant="outlined" onClick={handleReleaseClick}>
                      {t("workflow.action.release.button")}
                    </Button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "discard",
                            disabled: !allowDiscard,
                            label: t("workflow.action.discard.button"),
                            icon: <IconArrowBackUp size="1.25em" />,
                            onClick: handleDiscardClick,
                          },
                        ],
                      }}
                      trigger={["click"]}
                    >
                      <Button color="primary" disabled={!allowDiscard} icon={<IconDots size="1.25em" />} variant="outlined" />
                    </Dropdown>
                  </Space.Compact>
                </Space>
              </div>
            </div>

            <WorkflowElementsContainer className="pt-24" />
          </Card>
        </div>
      </Show>

      <Show when={tabValue === "runs"}>
        <div className="p-4">
          <div className="mx-auto max-w-320 pt-6">
            <WorkflowRuns workflowId={workflowId!} />
          </div>
        </div>
      </Show>
    </div>
  );
};

const WorkflowBaseInfoModal = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { t } = useTranslation();

  const { notification } = App.useApp();

  const { workflow, ...workflowState } = useWorkflowStore(useZustandShallowSelector(["workflow", "setBaseInfo"]));

  const formSchema = z.object({
    name: z
      .string(t("workflow.detail.baseinfo.form.name.placeholder"))
      .min(1, t("workflow.detail.baseinfo.form.name.placeholder"))
      .max(64, t("common.errmsg.string_max", { max: 64 })),
    description: z
      .string(t("workflow.detail.baseinfo.form.description.placeholder"))
      .max(256, t("common.errmsg.string_max", { max: 256 }))
      .nullish(),
  });
  const formRule = createSchemaFieldRule(formSchema);
  const {
    form: formInst,
    formPending,
    formProps,
    submit: submitForm,
  } = useAntdForm<z.infer<typeof formSchema>>({
    initialValues: { name: workflow.name, description: workflow.description },
    onSubmit: async (values) => {
      try {
        await workflowState.setBaseInfo(values.name!, values.description!);
      } catch (err) {
        notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });

        throw err;
      }
    },
  });

  const handleFormFinish = async () => {
    return submitForm();
  };

  return (
    <>
      <ModalForm
        disabled={formPending}
        layout="vertical"
        form={formInst}
        modalProps={{ destroyOnHidden: true }}
        okText={t("common.button.save")}
        title={t(`workflow.detail.baseinfo.modal.title`)}
        trigger={trigger}
        width={480}
        {...formProps}
        onFinish={handleFormFinish}
      >
        <Form.Item name="name" label={t("workflow.detail.baseinfo.form.name.label")} rules={[formRule]}>
          <Input placeholder={t("workflow.detail.baseinfo.form.name.placeholder")} />
        </Form.Item>

        <Form.Item name="description" label={t("workflow.detail.baseinfo.form.description.label")} rules={[formRule]}>
          <Input placeholder={t("workflow.detail.baseinfo.form.description.placeholder")} />
        </Form.Item>
      </ModalForm>
    </>
  );
};

export default WorkflowDetail;
