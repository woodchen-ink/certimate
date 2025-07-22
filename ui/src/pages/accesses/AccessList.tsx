import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconCirclePlus, IconCopy, IconEdit, IconFingerprint, IconPlus, IconReload, IconTrash } from "@tabler/icons-react";
import { useRequest } from "ahooks";
import { App, Avatar, Button, Input, Skeleton, Table, type TableProps, Tabs, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { ClientResponseError } from "pocketbase";

import AccessEditDrawer, { type AccessEditDrawerProps } from "@/components/access/AccessEditDrawer";
import Empty from "@/components/Empty";
import { type AccessModel } from "@/domain/access";
import { ACCESS_USAGES, accessProvidersMap } from "@/domain/provider";
import { useAppSettings, useZustandShallowSelector } from "@/hooks";
import { useAccessesStore } from "@/stores/access";
import { getErrMsg } from "@/utils/error";

type AccessUsages = AccessEditDrawerProps["usage"];

const AccessList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { t } = useTranslation();

  const { modal, notification } = App.useApp();

  const { appSettings: globalAppSettings } = useAppSettings();

  const { accesses, loadedAtOnce, fetchAccesses, deleteAccess } = useAccessesStore(
    useZustandShallowSelector(["accesses", "loadedAtOnce", "fetchAccesses", "deleteAccess"])
  );

  const [filters, setFilters] = useState<Record<string, unknown>>(() => {
    return {
      usage: searchParams.get("usage") || ("dns-hosting" satisfies AccessUsages),
      keyword: searchParams.get("keyword"),
    };
  });
  const [page, setPage] = useState<number>(() => parseInt(+searchParams.get("page")! + "") || 1);
  const [pageSize, setPageSize] = useState<number>(() => parseInt(+searchParams.get("perPage")! + "") || globalAppSettings.defaultPerPage!);

  const tableColumns: TableProps<AccessModel>["columns"] = [
    {
      key: "$index",
      align: "center",
      fixed: "left",
      width: 50,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      key: "name",
      title: t("access.props.name"),
      render: (_, record) => {
        return (
          <div className="flex max-w-full items-center gap-4 overflow-hidden">
            <Avatar shape="square" size={28} src={accessProvidersMap.get(record.provider)?.icon} />
            <div className="flex max-w-full flex-col gap-1 truncate">
              <Typography.Text ellipsis>{record.name || "\u00A0"}</Typography.Text>
              <Typography.Text ellipsis type="secondary">
                {t(accessProvidersMap.get(record.provider)?.name ?? "") || "\u00A0"}
              </Typography.Text>
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      title: t("access.props.created_at"),
      ellipsis: true,
      render: (_, record) => {
        return dayjs(record.created!).format("YYYY-MM-DD HH:mm:ss");
      },
    },
    {
      key: "$action",
      align: "end",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <div className="flex items-center justify-end">
          <Tooltip title={t("common.button.edit")}>
            <Button
              color="primary"
              icon={<IconEdit size="1.25em" />}
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordDetailClick(record);
              }}
            />
          </Tooltip>
          <Tooltip title={t("common.button.duplicate")}>
            <Button
              color="primary"
              icon={<IconCopy size="1.25em" />}
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordDuplicateClick(record);
              }}
            />
          </Tooltip>
          <Tooltip title={t("common.button.delete")}>
            <Button
              color="danger"
              icon={<IconTrash size="1.25em" />}
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordDeleteClick(record);
              }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];
  const [tableData, setTableData] = useState<AccessModel[]>([]);
  const [tableTotal, setTableTotal] = useState<number>(0);

  useEffect(() => {
    fetchAccesses().catch((err) => {
      if (err instanceof ClientResponseError && err.isAbort) {
        return;
      }

      console.error(err);
      notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
    });
  }, []);

  const { loading, run: refreshData } = useRequest(
    () => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const list = accesses
        .filter((e) => {
          const keyword = (filters["keyword"] as string | undefined)?.trim();
          if (keyword) {
            return e.name.includes(keyword);
          }

          return true;
        })
        .filter((e) => {
          const provider = accessProvidersMap.get(e.provider);
          switch (filters["usage"] as AccessUsages) {
            case "dns":
              return !e.reserve && provider?.usages?.includes(ACCESS_USAGES.DNS);
            case "hosting":
              return !e.reserve && provider?.usages?.includes(ACCESS_USAGES.HOSTING);
            case "dns-hosting":
              return !e.reserve && (provider?.usages?.includes(ACCESS_USAGES.DNS) || provider?.usages?.includes(ACCESS_USAGES.HOSTING));
            case "ca":
              return e.reserve === "ca" && provider?.usages?.includes(ACCESS_USAGES.CA);
            case "notification":
              return e.reserve === "notification" && provider?.usages?.includes(ACCESS_USAGES.NOTIFICATION);
          }
        });
      return Promise.resolve({
        items: list.slice(startIndex, endIndex),
        totalItems: list.length,
      });
    },
    {
      refreshDeps: [accesses, filters, page, pageSize],
      onBefore: () => {
        setSearchParams((prev) => {
          if (filters["keyword"]) {
            prev.set("keyword", filters["keyword"] as string);
          } else {
            prev.delete("keyword");
          }

          prev.set("usage", filters["usage"] as string);

          prev.set("page", page.toString());
          prev.set("perPage", pageSize.toString());

          return prev;
        });
      },
      onSuccess: (res) => {
        setTableData(res.items);
        setTableTotal(res.totalItems);
      },
    }
  );

  const handleTabChange = (key: string) => {
    setFilters((prev) => ({ ...prev, usage: key }));
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, keyword: value }));
    setPage(1);
  };

  const handleReloadClick = () => {
    if (loading) return;

    fetchAccesses();
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPage(page);
    setPageSize(pageSize);
  };

  const handleCreateClick = () => {
    navigate(`/accesses/new?usage=${filters["usage"]}`);
  };

  const [detailRecord, setDetailRecord] = useState<MaybeModelRecord<AccessModel>>();
  const [detailMode, setDetailMode] = useState<AccessEditDrawerProps["mode"]>("create");
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  const handleRecordDetailClick = (access: AccessModel) => {
    setDetailRecord(access);
    setDetailMode("edit");
    setDetailOpen(true);
  };

  const handleRecordDuplicateClick = (access: AccessModel) => {
    setDetailRecord({ ...access, id: undefined, name: `${access.name}-copy` });
    setDetailMode("create");
    setDetailOpen(true);
  };

  const handleRecordDeleteClick = async (access: AccessModel) => {
    modal.confirm({
      title: <span className="text-error">{t("access.action.delete.modal.title")}</span>,
      content: <span dangerouslySetInnerHTML={{ __html: t("access.action.delete.modal.content", { name: access.name }) }} />,
      icon: (
        <span className="anticon" role="img">
          <IconTrash className="text-error" size="1em" />
        </span>
      ),
      okText: t("common.button.confirm"),
      okButtonProps: { danger: true },
      onOk: async () => {
        // TODO: 有关联数据的不允许被删除
        try {
          await deleteAccess(access);
          refreshData();
        } catch (err) {
          console.error(err);
          notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });
        }
      },
    });
  };

  return (
    <div className="px-6 py-4">
      <div className="mx-auto max-w-320">
        <h1>{t("access.page.title")}</h1>
        <p className="text-base text-gray-500">{t("access.page.subtitle")}</p>

        <div className="flex items-center justify-between gap-x-2 gap-y-3 not-md:flex-col-reverse not-md:items-start not-md:justify-normal">
          <div className="flex w-full flex-1 items-center gap-x-2 md:max-w-200">
            <div className="flex-1">
              <Input.Search
                className="text-sm placeholder:text-sm"
                allowClear
                defaultValue={filters["keyword"] as string}
                placeholder={t("access.search.placeholder")}
                size="large"
                onSearch={handleSearch}
              />
            </div>
            <div>
              <Button icon={<IconReload size="1.25em" />} size="large" onClick={handleReloadClick} />
            </div>
          </div>
          <div>
            <Button className="text-sm" icon={<IconPlus size="1.25em" />} size="large" type="primary" onClick={handleCreateClick}>
              {t("access.action.create.button")}
            </Button>
          </div>
        </div>

        <Tabs
          className="mt-2 -mb-2"
          activeKey={filters["usage"] as string}
          items={[
            {
              key: "dns-hosting",
              label: t("access.props.usage.dns_hosting"),
            },
            {
              key: "ca",
              label: t("access.props.usage.ca"),
            },
            {
              key: "notification",
              label: t("access.props.usage.notification"),
            },
          ]}
          size="large"
          onChange={(key) => handleTabChange(key)}
        />

        <Table<AccessModel>
          columns={tableColumns}
          dataSource={tableData}
          loading={!loadedAtOnce || loading}
          locale={{
            emptyText: loading ? (
              <Skeleton />
            ) : (
              <Empty
                title={t("access.nodata.title")}
                description={t("access.nodata.description")}
                icon={<IconFingerprint size={24} />}
                extra={
                  <Button icon={<IconCirclePlus size="1.25em" />} type="primary" onClick={handleCreateClick}>
                    {t("access.action.create.button")}
                  </Button>
                }
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: tableTotal,
            showSizeChanger: true,
            onChange: handlePaginationChange,
            onShowSizeChange: handlePaginationChange,
          }}
          rowClassName="cursor-pointer"
          rowKey={(record) => record.id}
          scroll={{ x: "max(100%, 960px)" }}
          onRow={(record) => ({
            onClick: () => {
              handleRecordDetailClick(record);
            },
          })}
        />

        <AccessEditDrawer data={detailRecord} open={detailOpen} mode={detailMode} usage={filters["usage"] as AccessUsages} onOpenChange={setDetailOpen} />
      </div>
    </div>
  );
};

export default AccessList;
