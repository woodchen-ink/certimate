import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconBrowserShare, IconExternalLink, IconReload, IconShieldCheckeredFilled, IconTrash } from "@tabler/icons-react";
import { useRequest } from "ahooks";
import { App, Button, Input, Segmented, Skeleton, Table, type TableProps, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { ClientResponseError } from "pocketbase";

import CertificateDetailDrawer from "@/components/certificate/CertificateDetailDrawer";
import Empty from "@/components/Empty";
import { type CertificateModel } from "@/domain/certificate";
import { list as listCertificates, type ListRequest as listCertificatesRequest, remove as removeCertificate } from "@/repository/certificate";
import { getErrMsg } from "@/utils/error";

const CertificateList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { t } = useTranslation();

  const { modal, notification } = App.useApp();

  const [filters, setFilters] = useState<Record<string, unknown>>(() => {
    return {
      keyword: searchParams.get("keyword"),
      state: searchParams.get("state"),
    };
  });
  const [sorter, setSorter] = useState<ArrayElement<Parameters<NonNullable<TableProps<CertificateModel>["onChange"]>>[2]>>(() => {
    return {};
  });
  const [page, setPage] = useState<number>(() => parseInt(+searchParams.get("page")! + "") || 1);
  const [pageSize, setPageSize] = useState<number>(() => parseInt(+searchParams.get("perPage")! + "") || 15);

  const tableColumns: TableProps<CertificateModel>["columns"] = [
    {
      key: "$index",
      align: "center",
      fixed: "left",
      width: 50,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      key: "name",
      title: t("certificate.props.subject_alt_names"),
      render: (_, record) => <Typography.Text>{record.subjectAltNames}</Typography.Text>,
    },
    {
      key: "expiry",
      title: t("certificate.props.validity"),
      ellipsis: true,
      sorter: true,
      sortOrder: sorter.columnKey === "expiry" ? sorter.order : undefined,
      render: (_, record) => {
        const total = dayjs(record.expireAt).diff(dayjs(record.created), "d") + 1;
        const expired = dayjs().isAfter(dayjs(record.expireAt));
        const leftDays = dayjs(record.expireAt).diff(dayjs(), "d");

        return (
          <div className="flex max-w-full flex-col gap-1">
            {!expired ? (
              leftDays >= 1 ? (
                <Typography.Text type="success">
                  <span className="mr-1 inline-block size-2 rounded-full bg-success leading-2">&nbsp;</span>
                  {t("certificate.props.validity.left_days", { left: leftDays, total })}
                </Typography.Text>
              ) : (
                <Typography.Text type="warning">
                  <span className="mr-1 inline-block size-2 rounded-full bg-warning leading-2">&nbsp;</span>
                  {t("certificate.props.validity.less_than_a_day")}
                </Typography.Text>
              )
            ) : (
              <Typography.Text type="danger">
                <span className="mr-1 inline-block size-2 rounded-full bg-error leading-2">&nbsp;</span>
                {t("certificate.props.validity.expired")}
              </Typography.Text>
            )}

            <Typography.Text type="secondary">
              {t("certificate.props.validity.expiration", { date: dayjs(record.expireAt).format("YYYY-MM-DD") })}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      key: "brand",
      title: t("certificate.props.brand"),
      render: (_, record) => (
        <div className="flex max-w-full flex-col gap-1">
          <Typography.Text>{record.issuerOrg}</Typography.Text>
          <Typography.Text>{record.keyAlgorithm}</Typography.Text>
        </div>
      ),
    },
    {
      key: "source",
      title: t("certificate.props.source"),
      ellipsis: true,
      render: (_, record) => {
        const workflowId = record.workflowId;
        return (
          <div className="flex max-w-full flex-col gap-1">
            <Typography.Text>{t(`certificate.props.source.${record.source}`)}</Typography.Text>
            <Typography.Link
              type="secondary"
              ellipsis
              onClick={(e) => {
                e.stopPropagation();
                if (workflowId) {
                  navigate(`/workflows/${workflowId}`);
                }
              }}
            >
              {record.expand?.workflowId?.name ?? <span className="font-mono">{t(`#${workflowId}`)}</span>}
            </Typography.Link>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      title: t("certificate.props.created_at"),
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
          <Tooltip title={t("certificate.action.view")}>
            <Button
              color="primary"
              icon={<IconBrowserShare size="1.25em" />}
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordDetailClick(record);
              }}
            />
          </Tooltip>
          <Tooltip title={t("certificate.action.delete")}>
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
  const [tableData, setTableData] = useState<CertificateModel[]>([]);
  const [tableTotal, setTableTotal] = useState<number>(0);

  const {
    loading,
    error: loadedError,
    run: refreshData,
  } = useRequest(
    () => {
      let sort: string | undefined;
      if (sorter.columnKey === "expiry") {
        sort = sorter.order === "ascend" ? "expireAt" : sorter.order === "descend" ? "-expireAt" : "";
      }

      return listCertificates({
        keyword: filters["keyword"] as string,
        state: filters["state"] as listCertificatesRequest["state"],
        sort: sort,
        page: page,
        perPage: pageSize,
      });
    },
    {
      refreshDeps: [filters, sorter, page, pageSize],
      onSuccess: (res) => {
        setTableData(res.items);
        setTableTotal(res.totalItems);
      },
      onError: (err) => {
        if (err instanceof ClientResponseError && err.isAbort) {
          return;
        }

        console.error(err);
        notification.error({ message: t("common.text.request_error"), description: getErrMsg(err) });

        throw err;
      },
    }
  );

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, keyword: value.trim() }));
    setPage(1);
  };

  const handleReloadClick = () => {
    if (loading) return;

    refreshData();
  };

  const [detailRecord, setDetailRecord] = useState<CertificateModel>();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  const handleRecordDetailClick = (certificate: CertificateModel) => {
    setDetailRecord(certificate);
    setDetailOpen(true);
  };

  const handleRecordDeleteClick = (certificate: CertificateModel) => {
    modal.confirm({
      title: <span className="text-error">{t("certificate.action.delete")}</span>,
      content: <span dangerouslySetInnerHTML={{ __html: t("certificate.action.delete.confirm", { name: certificate.subjectAltNames }) }} />,
      icon: (
        <span className="anticon">
          <IconTrash className="text-error" size="1em" />
        </span>
      ),
      okText: t("common.button.confirm"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const resp = await removeCertificate(certificate);
          if (resp) {
            setTableData((prev) => prev.filter((item) => item.id !== certificate.id));
            refreshData();
          }
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
        <h1>{t("certificate.page.title")}</h1>
        <p className="text-base text-gray-500">{t("certificate.page.subtitle")}</p>

        <div className="flex items-center justify-between gap-x-2 gap-y-3 not-md:flex-col-reverse not-md:items-start not-md:justify-normal">
          <div className="flex w-full flex-1 items-center gap-x-2 md:max-w-200">
            <div>
              <Segmented
                className="shadow-xs"
                options={[
                  { label: <span className="text-sm">{t("certificate.props.validity.filter.all")}</span>, value: "" },
                  { label: <span className="text-sm">{t("certificate.props.validity.filter.expire_soon")}</span>, value: "expireSoon" },
                  { label: <span className="text-sm">{t("certificate.props.validity.filter.expired")}</span>, value: "expired" },
                ]}
                size="large"
                value={(filters["state"] as string) || ""}
                onChange={(value) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, state: value }));
                }}
              />
            </div>
            <div className="flex-1">
              <Input.Search
                className="text-sm placeholder:text-sm"
                allowClear
                defaultValue={filters["keyword"] as string}
                placeholder={t("certificate.search.placeholder")}
                size="large"
                onSearch={handleSearch}
              />
            </div>
            <div>
              <Button icon={<IconReload size="1.25em" />} size="large" onClick={handleReloadClick} />
            </div>
          </div>
          <div></div>
        </div>

        <Table<CertificateModel>
          className="mt-4"
          columns={tableColumns}
          dataSource={tableData}
          loading={loading}
          locale={{
            emptyText: loading ? (
              <Skeleton />
            ) : (
              <Empty
                title={t("certificate.nodata.title")}
                description={getErrMsg(loadedError ?? t("certificate.nodata.description"))}
                icon={<IconShieldCheckeredFilled size={24} />}
                extra={
                  loadedError ? (
                    <Button icon={<IconReload size="1.25em" />} type="primary" onClick={handleReloadClick}>
                      {t("common.button.reload")}
                    </Button>
                  ) : (
                    <Button icon={<IconExternalLink size="1.25em" />} type="primary" onClick={() => navigate("/workflows")}>
                      {t("certificate.nodata.button")}
                    </Button>
                  )
                }
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: tableTotal,
            showSizeChanger: true,
            onChange: (page: number, pageSize: number) => {
              setPage(page);
              setPageSize(pageSize);
            },
            onShowSizeChange: (page: number, pageSize: number) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
          rowClassName="cursor-pointer"
          rowKey={(record) => record.id}
          scroll={{ x: "max(100%, 960px)" }}
          onChange={(_, __, sorter) => {
            setSorter(Array.isArray(sorter) ? sorter[0] : sorter);
          }}
          onRow={(record) => ({
            onClick: () => {
              handleRecordDetailClick(record);
            },
          })}
        />

        <CertificateDetailDrawer data={detailRecord} open={detailOpen} onOpenChange={setDetailOpen} />
      </div>
    </div>
  );
};

export default CertificateList;
