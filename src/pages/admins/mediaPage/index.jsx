import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminMediaAPI } from "api/admin";
import { AdminState } from "component";
import "../admin.scss";

function AdminMediaPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ q: "", kind: "" });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => { load(1); }, []);

  const submit = (event) => {
    event.preventDefault();
    load(1);
  };

  const reset = () => {
    const empty = { q: "", kind: "" };
    setFilters(empty);
    load(1, empty);
  };

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{t("admin.media.title")}</h1>
            <p className="admin-page__subtitle">{t("admin.media.subtitle")}</p>
          </div>
          <span className="admin-media__total">{t("admin.media.total", { count: meta.total })}</span>
        </div>

        {error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}

        <section className="admin-page__panel">
          <form className="admin-page__toolbar admin-media__toolbar" onSubmit={submit}>
            <label>
              <span>{t("admin.media.search")}</span>
              <input
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
            <button className="admin-page__button" type="submit" disabled={loading}>{t("admin.common.search")}</button>
            <button className="admin-page__button admin-page__button--ghost" type="button" disabled={loading} onClick={reset}>{t("admin.products.resetFilters")}</button>
          </form>

          <p className="admin-media__hint">{t("admin.media.reuseHelp")}</p>

          {loading && !items.length ? (
            <AdminState type="loading" message={t("admin.common.loadingData")} />
          ) : items.length ? (
            <ul className="admin-media__grid">
              {items.map((item) => (
                <li key={item.key}>
                  <figure>
                    <img src={item.url} alt={item.label} loading="lazy" decoding="async" />
                    <figcaption>
                      <strong>{item.label}</strong>
                      <span>{t(`admin.media.${item.kind}`)}</span>
                      <small>{t("admin.media.usageCount", { count: item.usage_count })}</small>
                    </figcaption>
                  </figure>
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
      </div>
    </main>
  );
}

export default memo(AdminMediaPage);
