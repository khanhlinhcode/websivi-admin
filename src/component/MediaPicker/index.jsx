import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminMediaAPI } from "api/admin";
import AdminState from "component/AdminState";
import "./style.scss";

function MediaPicker({ onSelect, disabled = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ q: "", kind: "" });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState("");
  const [error, setError] = useState("");
  const searchInput = useRef(null);

  const load = async (page = 1, nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminMediaAPI({
        page,
        q: nextFilters.q.trim() || undefined,
        kind: nextFilters.kind || undefined,
      });
      setItems(response?.data || []);
      setMeta(response?.meta || { current_page: 1, last_page: 1, total: 0 });
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.media.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load(1);
    requestAnimationFrame(() => searchInput.current?.focus());
  }, [open]);

  const search = () => {
    load(1);
  };

  const submitOnEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      search();
    }
  };

  const choose = async (item) => {
    if (disabled || selecting) return;
    setSelecting(item.key);
    setError("");
    try {
      await onSelect(item);
      setOpen(false);
    } catch (err) {
      setError(
        Object.values(err?.response?.data?.errors || {}).flat()[0]
        || err?.response?.data?.message
        || t("admin.media.selectError")
      );
    } finally {
      setSelecting("");
    }
  };

  return (
    <div className="media-picker">
      <button
        type="button"
        className="admin-page__button admin-page__button--ghost"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? t("admin.media.closePicker") : t("admin.media.chooseExisting")}
      </button>
      {open && (
        <section className="media-picker__panel" aria-label={t("admin.media.pickerTitle")} aria-busy={loading}>
          <div className="media-picker__heading">
            <div>
              <h4>{t("admin.media.pickerTitle")}</h4>
              <p>{t("admin.media.pickerHelp")}</p>
            </div>
            <span>{t("admin.media.total", { count: meta.total })}</span>
          </div>
          <div className="media-picker__filters" onKeyDown={submitOnEnter}>
            <label>
              <span>{t("admin.media.search")}</span>
              <input
                ref={searchInput}
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder={t("admin.media.searchPlaceholder")}
              />
            </label>
            <label>
              <span>{t("admin.media.kind")}</span>
              <select
                value={filters.kind}
                onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="">{t("admin.media.allKinds")}</option>
                <option value="product">{t("admin.media.product")}</option>
                <option value="category">{t("admin.media.category")}</option>
                <option value="banner">{t("admin.media.banner")}</option>
              </select>
            </label>
            <button type="button" className="admin-page__button" disabled={loading} onClick={search}>{t("admin.common.search")}</button>
          </div>
          {error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}
          {loading && !items.length ? (
            <AdminState type="loading" message={t("admin.common.loadingData")} />
          ) : items.length ? (
            <ul className="media-picker__grid">
              {items.map((item) => (
                <li key={item.key}>
                  <button type="button" disabled={Boolean(selecting)} onClick={() => choose(item)}>
                    <img src={item.url} alt="" loading="lazy" decoding="async" />
                    <span className="media-picker__card-copy">
                      <strong>{item.label}</strong>
                      <small>{t(`admin.media.${item.kind}`)} · {t("admin.media.usageCount", { count: item.usage_count })}</small>
                    </span>
                    <span className="media-picker__select">
                      {selecting === item.key ? t("admin.media.selecting") : t("admin.media.useImage")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !error && <AdminState message={t("admin.media.empty")} />}
          {meta.last_page > 1 && (
            <div className="admin-page__pagination">
              <button type="button" disabled={loading || meta.current_page <= 1} onClick={() => load(meta.current_page - 1)}>{t("admin.common.previous")}</button>
              <span>{t("admin.media.pageStatus", { current: meta.current_page, last: meta.last_page })}</span>
              <button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => load(meta.current_page + 1)}>{t("admin.common.next")}</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default memo(MediaPicker);
