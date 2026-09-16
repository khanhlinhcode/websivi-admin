import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminAnalyticsAPI } from "api/admin";
import { AdminState } from "component";
import "../admin.scss";

function Breakdown({ title, items }) {
  return <section className="admin-page__panel"><h2 className="admin-page__panel-title">{title}</h2><div className="admin-page__mini-table">{(items || []).map((item) => <div key={item.label}><span>{item.label}</span><b>{item.total}</b></div>)}{!items?.length && <p>—</p>}</div></section>;
}
function AnalyticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { setBusy(true); setError(""); try { setData(await getAdminAnalyticsAPI({ range })); } catch (err) { setError(err?.response?.data?.message || t("admin.analytics.loadError")); } finally { setBusy(false); } };
  useEffect(() => { load(); }, [range]);
  const max = useMemo(() => Math.max(1, ...(data?.by_day || []).map((item) => item.page_views)), [data]);
  const totals = data?.totals || {};
  const cards = [['pageViews', totals.page_views || 0],['sessions', totals.sessions || 0],['visitors', totals.visitors || 0],['orders', totals.tracked_orders || 0],['conversion', `${totals.conversion_rate || 0}%`]];
  return <main className="admin-page"><div className="container"><div className="admin-page__header"><div><h1 className="admin-page__title">{t("admin.analytics.title")}</h1><p className="admin-page__subtitle">{t("admin.analytics.subtitle")}</p></div><select aria-label={t("admin.analytics.title")} value={range} onChange={(e) => setRange(e.target.value)}><option value="7d">{t("admin.analytics.range7d")}</option><option value="30d">{t("admin.analytics.range30d")}</option><option value="90d">{t("admin.analytics.range90d")}</option></select></div>
    {error && <AdminState type="error" message={error} actionLabel={t("common.retry")} onAction={load}/>} {busy && !data && <AdminState type="loading" message={t("admin.common.loadingData")}/>} {data && <><section className="admin-page__stats admin-page__stats--five">{cards.map(([key,value]) => <div className="admin-page__stat-card" key={key}><span>{t(`admin.analytics.${key}`)}</span><strong>{value}</strong></div>)}</section><section className="admin-page__panel"><h2 className="admin-page__panel-title">{t("admin.analytics.trend")}</h2><div className="admin-page__chart">{data.by_day.map((item) => <div className="admin-page__chart-item" key={item.date}><span style={{height: `${Math.max(8, item.page_views / max * 120)}px`}}/><small>{item.date}</small><b>{item.page_views}</b></div>)}{!data.by_day.length && <p>{t("admin.analytics.empty")}</p>}</div></section><div className="admin-page__grid admin-page__grid--thirds"><Breakdown title={t("admin.analytics.devices")} items={data.devices}/><Breakdown title={t("admin.analytics.browsers")} items={data.browsers}/><Breakdown title={t("admin.analytics.operatingSystems")} items={data.operating_systems}/><Breakdown title={t("admin.analytics.topPages")} items={data.top_pages}/><Breakdown title={t("admin.analytics.referrers")} items={data.referrers}/></div><p className="admin-page__privacy-note">{t("admin.analytics.privacyNote")}</p></>}
  </div></main>;
}
export default memo(AnalyticsPage);
