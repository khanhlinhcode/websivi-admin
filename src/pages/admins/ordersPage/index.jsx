import { memo, useEffect, useMemo, useState } from "react";
import {
  exportAdminOrdersAPI,
  getAdminOrdersAPI,
  updateAdminOrderStatusAPI,
} from "api/admin";
import { AdminState, ConfirmModal } from "component";
import { formatter } from "utils/formatter";
import { useTranslation } from "react-i18next";
import "../admin.scss";

const STATUS_OPTIONS = [
  { value: "", labelKey: "admin.orders.allStatus" },
  { value: "pending", labelKey: "admin.orders.pending" },
  { value: "confirmed", labelKey: "admin.orders.confirmed" },
  { value: "processing", labelKey: "admin.orders.processing" },
  { value: "shipped", labelKey: "admin.orders.shipped" },
  { value: "delivered", labelKey: "admin.orders.delivered" },
  { value: "cancelled", labelKey: "admin.orders.cancelled" },
];

const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const statusLabel = (status, t) => {
  const option = STATUS_OPTIONS.find((item) => item.value === status);
  return option ? t(option.labelKey) : status;
};

const getOrderTotal = (order) => {
  if (order.grand_total !== undefined && order.grand_total !== null) {
    return Number(order.grand_total);
  }

  if (order.total !== undefined && order.total !== null) {
    return Number(order.total);
  }

  return (order.details || []).reduce((sum, detail) => {
    return sum + Number(detail.line_total || 0);
  }, 0);
};

const AdminOrdersPage = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keyword, setKeyword] = useState("");
  const [drafts, setDrafts] = useState({});
  const [pendingChange, setPendingChange] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState({ orders: 0, pending: 0, delivered_revenue: 0 });

  const totals = useMemo(() => {
    return {
      totalOrders: Number(summary.orders || 0),
      ordered: Number(summary.pending || 0),
      revenue: Number(summary.delivered_revenue || 0),
    };
  }, [summary]);

  const loadOrders = async (page = 1, overrides = {}) => {
    setIsLoading(true);
    setError("");

    try {
      const nextFilters = {
        status,
        paymentMethod,
        paymentStatus,
        dateFrom,
        dateTo,
        keyword,
        ...overrides,
      };
      const response = await getAdminOrdersAPI({
        status: nextFilters.status || undefined,
        payment_method: nextFilters.paymentMethod || undefined,
        payment_status: nextFilters.paymentStatus || undefined,
        date_from: nextFilters.dateFrom || undefined,
        date_to: nextFilters.dateTo || undefined,
        keyword: nextFilters.keyword || undefined,
        page,
        per_page: 20,
      });
      const items = Array.isArray(response) ? response : response?.data || [];
      setOrders(items);
      setMeta(
        response?.meta || { current_page: 1, last_page: 1, total: items.length }
      );
      setSummary(
        response?.summary || {
          orders: items.length,
          pending: items.filter((order) => order.status === "pending").length,
          delivered_revenue: items
            .filter((order) => order.status === "delivered")
            .reduce((sum, order) => sum + getOrderTotal(order), 0),
        }
      );
      setExpandedId(null);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.orders.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paymentMethod, paymentStatus]);

  const updateDraft = (orderId, patch) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || {}),
        ...patch,
      },
    }));
  };

  const confirmStatusChange = (order) => {
    const draft = drafts[order.id] || {};
    const nextStatuses = NEXT_STATUS[order.status] || [];
    const nextStatus = draft.status || nextStatuses[0];

    if (!nextStatus) {
      return;
    }

    setPendingChange({
      orderId: order.id,
      status: nextStatus,
      note: draft.note || "",
    });
  };

  const handleStatusChange = async () => {
    if (!pendingChange) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await updateAdminOrderStatusAPI(
        pendingChange.orderId,
        pendingChange.status,
        pendingChange.note
      );
      setDrafts((current) => ({
        ...current,
        [pendingChange.orderId]: { status: "", note: "" },
      }));
      setMessage(t("admin.orders.statusUpdated"));
      await loadOrders(meta.current_page);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.orders.statusUpdateError"));
    } finally {
      setPendingChange(null);
    }
  };

  const resetFilters = () => {
    setStatus("");
    setPaymentMethod("");
    setPaymentStatus("");
    setDateFrom("");
    setDateTo("");
    setKeyword("");
    loadOrders(1, {
      status: "",
      paymentMethod: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
      keyword: "",
    });
  };

  const handleExport = async () => {
    try {
      const blob = await exportAdminOrdersAPI({
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        payment_status: paymentStatus || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        keyword: keyword || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "orders.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || t("common.error"));
    }
  };

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{t("admin.orders.title")}</h1>
            <p className="admin-page__subtitle">
              {t("admin.orders.subtitle")}
            </p>
          </div>
          <button className="admin-page__button" onClick={() => loadOrders(meta.current_page)} disabled={isLoading}>
            {t("admin.common.refresh")}
          </button>
        </div>

        {message && <div className="admin-page__message" role="status">{message}</div>}
        {error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}

        <div className="admin-page__toolbar">
          <span className="admin-page__badge">
            {t("admin.orders.totalOrders", { count: totals.totalOrders })}
          </span>
          <span className="admin-page__badge">
            {t("admin.orders.newOrders", { count: totals.ordered })}
          </span>
          <span className="admin-page__badge">
            {t("admin.orders.revenue", { amount: formatter(totals.revenue) })}
          </span>
        </div>

        <div className="admin-page__panel">
          <div className="admin-page__toolbar">
            <select aria-label={t("admin.orders.status")} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
            <select
              aria-label={t("admin.orders.paymentMethod")}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">{t("admin.orders.allPaymentMethods")}</option>
              <option value="cod">{t("order.paymentMethods.cod")}</option>
              <option value="vnpay">{t("order.paymentMethods.vnpay")}</option>
            </select>
            <select
              aria-label={t("admin.orders.paymentStatus")}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="">{t("admin.orders.allPaymentStatus")}</option>
              <option value="pending">{t("myOrders.status.pendingPayment")}</option>
              <option value="paid">{t("order.paidBadge")}</option>
              <option value="failed">{t("myOrders.status.paymentFailed")}</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              aria-label={t("admin.orders.dateFrom")}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              value={dateTo}
              aria-label={t("admin.orders.dateTo")}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <input
              aria-label={t("admin.orders.searchPlaceholder")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("admin.orders.searchPlaceholder")}
            />
            <button className="admin-page__button" onClick={() => loadOrders(1)} disabled={isLoading}>
              {t("admin.common.search")}
            </button>
            <button
              type="button"
              className="admin-page__button admin-page__button--ghost"
              onClick={resetFilters}
              disabled={isLoading}
            >
              {t("admin.orders.resetFilters")}
            </button>
            <button
              type="button"
              className="admin-page__button admin-page__button--ghost"
              onClick={handleExport}
            >
              {t("admin.orders.exportCsv")}
            </button>
          </div>

          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr>
                  <th>{t("admin.common.code")}</th>
                  <th>{t("admin.orders.customer")}</th>
                  <th>{t("admin.orders.contact")}</th>
                  <th>{t("admin.orders.totalPrice")}</th>
                  <th>{t("admin.orders.status")}</th>
                  <th>{t("admin.orders.paymentStatus")}</th>
                  <th>{t("admin.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextStatuses = NEXT_STATUS[order.status] || [];
                  const draft = drafts[order.id] || {};
                  const draftStatus = draft.status || nextStatuses[0] || "";
                  const isExpanded = expandedId === order.id;

                  return (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>
                        <strong>{order.fullname}</strong>
                        <br />
                        <span>{order.address || t("admin.orders.noAddress")}</span>
                      </td>
                      <td>
                        <span>{order.phone || t("admin.orders.noPhone")}</span>
                        <br />
                        <span>{order.email || t("admin.orders.noEmail")}</span>
                      </td>
                      <td>{formatter(getOrderTotal(order))}</td>
                      <td>
                        <span className={`admin-page__status is-${order.status}`}>
                          {statusLabel(order.status, t)}
                        </span>
                      </td>
                      <td>
                        <span className="admin-page__badge">
                          {order.payment_method
                            ? t(`order.paymentMethods.${order.payment_method}`)
                            : t("common.noData")}
                        </span>
                        <br />
                        <span>{order.payment_status || t("common.noData")}</span>
                      </td>
                      <td>
                        <button
                          className="admin-page__button admin-page__button--ghost"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : order.id)
                          }
                        >
                          {isExpanded
                            ? t("admin.orders.hide")
                            : t("admin.orders.detail")}
                        </button>
                        {isExpanded && (
                          <div className="admin-page__details">
                            <div className="admin-page__details-list">
                              {(order.details || []).map((detail) => (
                                <div key={detail.id}>
                                  {detail.product_name ||
                                    detail.product?.name ||
                                    t("admin.orders.deletedProduct")}{" "}
                                  x {detail.quantity}
                                  {" - "}
                                  {formatter(Number(detail.line_total || 0))}
                                </div>
                              ))}
                              {order.note && (
                                <div>
                                  {t("admin.orders.note")}: {order.note}
                                </div>
                              )}
                              <div>
                                {t("admin.orders.createdAt")}: {order.created_at ? new Date(order.created_at).toLocaleString() : t("common.noData")}
                              </div>
                              {order.coupon && (
                                <div>
                                  {t("admin.orders.coupon")}: {order.coupon.code}
                                </div>
                              )}
                              {Number(order.discount_amount || 0) > 0 && (
                                <div>
                                  {t("admin.orders.discount")}: -{formatter(order.discount_amount)}
                                </div>
                              )}
                              <div>
                                {t("admin.orders.subtotal")}:{" "}
                                {formatter(order.subtotal ?? order.total ?? 0)}
                              </div>
                              <div>
                                {t("admin.orders.shippingFee")}:{" "}
                                {Number(order.shipping_fee || 0) === 0
                                  ? t("checkout.freeShipping")
                                  : formatter(order.shipping_fee)}
                              </div>
                              <div>
                                <b>
                                  {t("admin.orders.grandTotal")}:{" "}
                                  {formatter(getOrderTotal(order))}
                                </b>
                              </div>
                            </div>

                            <div className="admin-page__status-panel">
                              <b>{t("admin.orders.updateStatus")}</b>
                              {nextStatuses.length > 0 ? (
                                <>
                                  <select
                                    value={draftStatus}
                                    onChange={(event) =>
                                      updateDraft(order.id, {
                                        status: event.target.value,
                                      })
                                    }
                                  >
                                    {nextStatuses.map((item) => (
                                      <option key={item} value={item}>
                                        {statusLabel(item, t)}
                                      </option>
                                    ))}
                                  </select>
                                  <textarea
                                    value={draft.note || ""}
                                    placeholder={t("admin.orders.statusNotePlaceholder")}
                                    onChange={(event) =>
                                      updateDraft(order.id, {
                                        note: event.target.value,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="admin-page__button"
                                    onClick={() => confirmStatusChange(order)}
                                  >
                                    {t("admin.orders.updateStatus")}
                                  </button>
                                </>
                              ) : (
                                <span>{t("admin.orders.noNextStatus")}</span>
                              )}
                            </div>

                            <div className="admin-page__timeline">
                              <b>{t("admin.orders.timeline")}</b>
                              {(order.status_history || []).map((item) => (
                                <div key={item.id} className="admin-page__timeline-item">
                                  <span>
                                    {statusLabel(item.from_status, t)} {" -> "}
                                    {statusLabel(item.to_status, t)}
                                  </span>
                                  <small>
                                    {item.changed_by?.name || t("admin.orders.systemActor")}
                                    {item.note ? ` - ${item.note}` : ""}
                                  </small>
                                </div>
                              ))}
                              {!order.status_history?.length && (
                                <span>{t("admin.orders.noTimeline")}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!orders.length && !isLoading && (
                  <tr>
                    <td colSpan={7} className="admin-page__empty">
                      <AdminState message={t("admin.orders.empty")} />
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="admin-page__empty">
                      <AdminState type="loading" message={t("admin.common.loadingData")} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {meta.last_page > 1 && (
            <div className="admin-page__pagination">
              <button
                type="button"
                disabled={meta.current_page <= 1 || isLoading}
                onClick={() => loadOrders(meta.current_page - 1)}
              >
                {t("admin.common.previous")}
              </button>
              <span>
                {t("admin.orders.pageStatus", {
                  current: meta.current_page,
                  last: meta.last_page,
                  total: meta.total,
                })}
              </span>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page || isLoading}
                onClick={() => loadOrders(meta.current_page + 1)}
              >
                {t("admin.common.next")}
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingChange)}
        title={t("admin.orders.confirmStatusTitle")}
        message={t("admin.orders.confirmStatusMessage", {
          id: pendingChange?.orderId || "",
          status: pendingChange ? statusLabel(pendingChange.status, t) : "",
        })}
        onConfirm={handleStatusChange}
        onCancel={() => setPendingChange(null)}
      />
    </main>
  );
};

export default memo(AdminOrdersPage);
