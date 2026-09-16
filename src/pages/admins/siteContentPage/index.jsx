import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminSiteSettingsAPI, updateAdminSiteSettingsAPI } from "api/admin";
import { AdminState } from "component";
import { STOREFRONT_URL } from "utils/router";
import "../admin.scss";

const fields = {
  contactGroup: [['brand_name','brand','text'],['contact_email','email','email'],['contact_phone','contactPhone','tel'],['support_phone','supportPhone','tel'],['address_vi','addressVi','text'],['address_en','addressEn','text'],['facebook_url','facebook','url'],['instagram_url','instagram','url'],['linkedin_url','linkedin','url'],['twitter_url','twitter','url']],
  homeGroup: [['featured_title_vi','featuredVi','text'],['featured_title_en','featuredEn','text'],['recommended_title_vi','recommendedVi','text'],['recommended_title_en','recommendedEn','text'],['footer_description_vi','footerVi','textarea'],['footer_description_en','footerEn','textarea']],
  shippingGroup: [['free_shipping_threshold','freeShipping','number'],['shipping_fee','shippingFee','number']],
};

function SiteContentPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => { setBusy(true); setError(""); try { setForm(await getAdminSiteSettingsAPI()); } catch (err) { setError(err?.response?.data?.message || t("admin.siteContent.loadError")); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const payload = { ...form, free_shipping_threshold: Number(form.free_shipping_threshold), shipping_fee: Number(form.shipping_fee) }; setForm(await updateAdminSiteSettingsAPI(payload)); setMessage(t("admin.siteContent.saved")); } catch (err) { setError(Object.values(err?.response?.data?.errors || {}).flat()[0] || err?.response?.data?.message || t("admin.siteContent.saveError")); } finally { setBusy(false); } };
  const requiredFields = new Set(['brand_name', 'contact_email', 'contact_phone', 'address_vi', 'address_en', 'featured_title_vi', 'featured_title_en', 'recommended_title_vi', 'recommended_title_en', 'free_shipping_threshold', 'shipping_fee']);
  return <main className="admin-page"><div className="container"><div className="admin-page__header"><div><h1 className="admin-page__title">{t("admin.siteContent.title")}</h1><p className="admin-page__subtitle">{t("admin.siteContent.subtitle")}</p></div><a className="admin-page__button admin-page__button--ghost" href={STOREFRONT_URL} target="_blank" rel="noreferrer">{t("admin.viewStore")}</a></div>
    {error && form && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}{message && <div className="admin-page__message" role="status">{message}</div>}
    {!form ? error ? <AdminState type="error" message={error} actionLabel={t("common.retry")} onAction={load} /> : <AdminState type="loading" message={t("admin.common.loadingData")} /> : <form className="admin-content-form" onSubmit={save}>{Object.entries(fields).map(([group, items]) => <section className="admin-page__panel" key={group}><h2 className="admin-page__panel-title">{t(`admin.siteContent.${group}`)}</h2><div className="admin-page__form-grid">{items.map(([name,key,type]) => <label key={name}>{t(`admin.siteContent.${key}`)}{type === 'textarea' ? <textarea name={name} value={form[name] || ""} onChange={change} required={requiredFields.has(name)}/> : <input name={name} type={type} min={type === 'number' ? 0 : undefined} value={form[name] ?? ""} onChange={change} required={requiredFields.has(name)} />}</label>)}</div></section>)}<button className="admin-page__button" disabled={busy}>{t("admin.common.saveChanges")}</button></form>}
  </div></main>;
}
export default memo(SiteContentPage);
