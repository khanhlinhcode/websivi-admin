import { memo, useEffect, useState } from "react";
import {
  createAdminCouponAPI,
  deleteAdminCouponAPI,
  getAdminCouponStatsAPI,
  getAdminCouponsAPI,
  updateAdminCouponAPI,
} from "api/admin";
import { ConfirmModal } from "component";
import { formatter } from "utils/formatter";
import { useTranslation } from "react-i18next";
import "../admin.scss";

const emptyCouponForm = {
  code: "",
  type: "percent",
  value: "",
  min_order_amount: "0",
  max_discount_amount: "",
  max_uses: "",
  max_uses_per_user: "1",
  starts_at: "",
  expires_at: "",
  active: true,
};

const toDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
};

const couponToForm = (coupon) => ({
  code: coupon.code || "",
  type: coupon.type || "percent",
  value: coupon.value || "",
  min_order_amount: coupon.min_order_amount || "0",
  max_discount_amount: coupon.max_discount_amount || "",
  max_uses: coupon.max_uses || "",
  max_uses_per_user: coupon.max_uses_per_user || "1",
  starts_at: toDateTimeLocal(coupon.starts_at),
  expires_at: toDateTimeLocal(coupon.expires_at),
  active: coupon.active !== false,
});

const AdminCouponsPage = () => {
  const { t, i18n } = useTranslation();
  const [coupons, setCoupons] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [form, setForm] = useState(emptyCouponForm);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [pendingDeleteCoupon, setPendingDeleteCoupon] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCoupons = async (page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getAdminCouponsAPI({ page });
      const items = response?.data || [];
      setCoupons(items);
      setMeta({
        current_page: response?.current_page || 1,
        last_page: response?.last_page || 1,
        total: response?.total || items.length,
      });
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.coupons.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (coupon = null) => {
    setEditingCoupon(coupon);
    setForm(coupon ? couponToForm(coupon) : emptyCouponForm);
    setIsModalOpen(true);
    setMessage("");
    setError("");
  };

  const closeModal = () => {
    setEditingCoupon(null);
    setForm(emptyCouponForm);
    setIsModalOpen(false);
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toPayload = () => ({
    code: form.code,
    type: form.type,
    value: Number(form.value),
    min_order_amount: Number(form.min_order_amount || 0),
    max_discount_amount: form.max_discount_amount
      ? Number(form.max_discount_amount)
      : null,
    max_uses: form.max_uses ? Number(form.max_uses) : null,
    max_uses_per_user: Number(form.max_uses_per_user || 1),
    starts_at: form.starts_at || null,
    expires_at: form.expires_at || null,
    active: Boolean(form.active),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      if (editingCoupon) {
        await updateAdminCouponAPI(editingCoupon.id, toPayload());
        setMessage(t("admin.coupons.updated"));
      } else {
        await createAdminCouponAPI(toPayload());
        setMessage(t("admin.coupons.created"));
      }

      closeModal();
      loadCoupons(editingCoupon ? meta.current_page : 1);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.coupons.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    setMessage("");
    setError("");

    try {
      await updateAdminCouponAPI(coupon.id, {
        ...couponToForm(coupon),
        active: !coupon.active,
      });
      setMessage(t("admin.coupons.updated"));
      loadCoupons(meta.current_page);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.coupons.saveError"));
    }
  };

  const handleDeleteCoupon = async () => {
    if (!pendingDeleteCoupon) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await deleteAdminCouponAPI(pendingDeleteCoupon.id);
      setMessage(t("admin.coupons.deleted"));
      setPendingDeleteCoupon(null);
      loadCoupons(meta.current_page);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.coupons.deleteError"));
    }
  };

  const handleLoadStats = async (coupon) => {
    setError("");

    try {
      const response = await getAdminCouponStatsAPI(coupon.id);
      setStats(response);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.coupons.statsError"));
    }
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN")
      : t("admin.coupons.noLimit");

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{t("admin.coupons.title")}</h1>
            <p className="admin-page__subtitle">{t("admin.coupons.subtitle")}</p>
          </div>
          <div className="admin-page__actions">
            <button
              type="button"
              className="admin-page__button admin-page__button--ghost"
              onClick={() => loadCoupons(meta.current_page)}
            >
              {t("admin.common.refresh")}
            </button>
            <button
              type="button"
              className="admin-page__button"
              onClick={() => openModal()}
            >
              {t("admin.coupons.add")}
            </button>
          </div>
        </div>

        {message && <div className="admin-page__message">{message}</div>}
        {error && (
          <div className="admin-page__message admin-page__message--error">
            {error}
          </div>
        )}

        <div className="admin-page__panel">
          <div className="admin-page__panel-head">
            <h2 className="admin-page__panel-title">
              {t("admin.coupons.listTitle")}
            </h2>
            <span>{t("admin.coupons.pageStatus", meta)}</span>
          </div>
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr>
                  <th>{t("admin.coupons.code")}</th>
                  <th>{t("admin.coupons.type")}</th>
                  <th>{t("admin.coupons.value")}</th>
                  <th>{t("admin.coupons.usage")}</th>
                  <th>{t("admin.coupons.expiresAt")}</th>
                  <th>{t("admin.coupons.status")}</th>
                  <th>{t("admin.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <button
                        type="button"
                        className="admin-page__link-button"
                        onClick={() => handleLoadStats(coupon)}
                      >
                        {coupon.code}
                      </button>
                    </td>
                    <td>{t(`admin.coupons.types.${coupon.type}`)}</td>
                    <td>
                      {coupon.type === "percent"
                        ? `${Number(coupon.value)}%`
                        : formatter(coupon.value)}
                    </td>
                    <td>
                      {coupon.used_count || 0}/
                      {coupon.max_uses || t("admin.coupons.unlimited")}
                    </td>
                    <td>{formatDate(coupon.expires_at)}</td>
                    <td>
                      <span
                        className={`admin-page__badge ${
                          coupon.active ? "" : "admin-page__badge--danger"
                        }`}
                      >
                        {coupon.active
                          ? t("admin.coupons.active")
                          : t("admin.coupons.inactive")}
                      </span>
                    </td>
                    <td>
                      <div className="admin-page__actions">
                        <button
                          type="button"
                          className="admin-page__button admin-page__button--ghost"
                          onClick={() => handleToggleActive(coupon)}
                        >
                          {coupon.active
                            ? t("admin.coupons.disable")
                            : t("admin.coupons.enable")}
                        </button>
                        <button
                          type="button"
                          className="admin-page__button admin-page__button--ghost"
                          onClick={() => openModal(coupon)}
                        >
                          {t("admin.common.edit")}
                        </button>
                        <button
                          type="button"
                          className="admin-page__button admin-page__button--danger"
                          onClick={() => setPendingDeleteCoupon(coupon)}
                        >
                          {t("admin.common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && coupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-page__empty">
                      {t("admin.coupons.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="admin-page__empty">{t("common.loading")}</div>}
          <div className="admin-page__pagination">
            <button
              type="button"
              disabled={meta.current_page <= 1}
              onClick={() => loadCoupons(meta.current_page - 1)}
            >
              {t("admin.common.previous")}
            </button>
            <span>{t("admin.coupons.pageStatus", meta)}</span>
            <button
              type="button"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => loadCoupons(meta.current_page + 1)}
            >
              {t("admin.common.next")}
            </button>
          </div>
        </div>

        {stats && (
          <div className="admin-page__panel admin-page__details">
            <div className="admin-page__panel-head">
              <h2 className="admin-page__panel-title">
                {t("admin.coupons.usageStats")} - {stats.coupon?.code}
              </h2>
              <button
                type="button"
                className="admin-page__button admin-page__button--ghost"
                onClick={() => setStats(null)}
              >
                {t("common.close")}
              </button>
            </div>
            <div className="admin-page__mini-table">
              <div>
                <span>{t("admin.coupons.totalUsed")}</span>
                <b>{stats.total_used}</b>
              </div>
              <div>
                <span>{t("admin.coupons.totalDiscount")}</span>
                <b>{formatter(stats.total_discount_amount || 0)}</b>
              </div>
            </div>
            <div className="admin-page__table-wrap">
              <table className="admin-page__table">
                <thead>
                  <tr>
                    <th>{t("admin.users.title")}</th>
                    <th>{t("admin.orders.currentStatus")}</th>
                    <th>{t("admin.coupons.discountAmount")}</th>
                    <th>{t("admin.users.createdAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.users || []).map((usage) => (
                    <tr key={usage.id}>
                      <td>
                        {usage.user?.name || t("reviews.customer")}
                        <br />
                        <small>{usage.user?.email}</small>
                      </td>
                      <td>#{usage.order?.id}</td>
                      <td>{formatter(usage.discount_amount)}</td>
                      <td>{formatDate(usage.created_at)}</td>
                    </tr>
                  ))}
                  {(!stats.users || stats.users.length === 0) && (
                    <tr>
                      <td colSpan={4} className="admin-page__empty">
                        {t("admin.coupons.noUsage")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="admin-page__modal" role="dialog" aria-modal="true">
          <form className="admin-page__modal-form" onSubmit={handleSubmit}>
            <h2>
              {editingCoupon
                ? t("admin.coupons.editTitle")
                : t("admin.coupons.createTitle")}
            </h2>
            <label>
              {t("admin.coupons.code")}
              <input name="code" value={form.code} onChange={handleChange} required />
            </label>
            <label>
              {t("admin.coupons.type")}
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="percent">{t("admin.coupons.types.percent")}</option>
                <option value="fixed">{t("admin.coupons.types.fixed")}</option>
              </select>
            </label>
            <label>
              {t("admin.coupons.value")}
              <input
                type="number"
                min="0"
                step="0.01"
                name="value"
                value={form.value}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              {t("admin.coupons.minOrderAmount")}
              <input
                type="number"
                min="0"
                step="1000"
                name="min_order_amount"
                value={form.min_order_amount}
                onChange={handleChange}
              />
            </label>
            <label>
              {t("admin.coupons.maxDiscountAmount")}
              <input
                type="number"
                min="0"
                step="1000"
                name="max_discount_amount"
                value={form.max_discount_amount}
                onChange={handleChange}
              />
            </label>
            <label>
              {t("admin.coupons.maxUses")}
              <input
                type="number"
                min="1"
                name="max_uses"
                value={form.max_uses}
                onChange={handleChange}
              />
            </label>
            <label>
              {t("admin.coupons.maxUsesPerUser")}
              <input
                type="number"
                min="1"
                name="max_uses_per_user"
                value={form.max_uses_per_user}
                onChange={handleChange}
              />
            </label>
            <label>
              {t("admin.coupons.startsAt")}
              <input
                type="datetime-local"
                name="starts_at"
                value={form.starts_at}
                onChange={handleChange}
              />
            </label>
            <label>
              {t("admin.coupons.expiresAt")}
              <input
                type="datetime-local"
                name="expires_at"
                value={form.expires_at}
                onChange={handleChange}
              />
            </label>
            <label className="admin-page__checkbox">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />
              {t("admin.coupons.active")}
            </label>
            <div className="admin-page__actions">
              <button
                type="button"
                className="admin-page__button admin-page__button--ghost"
                onClick={closeModal}
              >
                {t("admin.common.cancel")}
              </button>
              <button
                type="submit"
                className="admin-page__button"
                disabled={isSaving}
              >
                {isSaving ? t("common.loading") : t("admin.common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDeleteCoupon)}
        title={t("admin.coupons.confirmDeleteTitle")}
        message={t("admin.coupons.confirmDeleteMessage", {
          code: pendingDeleteCoupon?.code || "",
        })}
        onConfirm={handleDeleteCoupon}
        onCancel={() => setPendingDeleteCoupon(null)}
      />
    </main>
  );
};

export default memo(AdminCouponsPage);
