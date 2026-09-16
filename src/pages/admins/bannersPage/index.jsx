import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  createAdminBannerAPI,
  deleteAdminBannerAPI,
  getAdminBannersAPI,
  updateAdminBannerAPI,
} from "api/admin";
import { AdminState, ConfirmModal } from "component";
import { isAdmin } from "utils/adminAuth";
import { selectAdminUser } from "../../../redux/authSlice";
import "../admin.scss";

const emptyForm = {
  placement: "hero", title_vi: "", title_en: "", subtitle_vi: "", subtitle_en: "",
  button_label_vi: "", button_label_en: "", alt_text_vi: "", alt_text_en: "",
  link_url: "", sort_order: 0, is_active: true, starts_at: "", ends_at: "", image: null,
};
const localDate = (value) => value ? String(value).slice(0, 16) : "";

function AdminBannersPage() {
  const { t } = useTranslation();
  const user = useSelector(selectAdminUser);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialogTitle = useRef(null);
  const previousFocus = useRef(null);
  const preview = useMemo(() => form.image ? URL.createObjectURL(form.image) : editing?.image_url || "", [form.image, editing]);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const load = async () => {
    setBusy(true); setError("");
    try { setItems(await getAdminBannersAPI()); }
    catch (err) { setError(err?.response?.data?.message || t("admin.banners.loadError")); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (open) dialogTitle.current?.focus(); }, [open]);

  const openDialog = () => { previousFocus.current = document.activeElement; setOpen(true); };
  const closeDialog = () => {
    setOpen(false);
    requestAnimationFrame(() => previousFocus.current?.focus());
  };
  const onDialogKeyDown = (event) => {
    if (event.key === "Escape" && !busy) closeDialog();
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll('input:not(:disabled), select:not(:disabled), button:not(:disabled)')];
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const startCreate = () => { setEditing(null); setForm(emptyForm); openDialog(); setError(""); setMessage(""); };
  const startEdit = (item) => {
    setEditing(item);
    setForm({
      placement: item.placement, title_vi: item.title_vi || "", title_en: item.title_en || "",
      subtitle_vi: item.subtitle_vi || "", subtitle_en: item.subtitle_en || "",
      button_label_vi: item.button_label_vi || "", button_label_en: item.button_label_en || "",
      alt_text_vi: item.alt_text_vi || "", alt_text_en: item.alt_text_en || "", link_url: item.link_url || "",
      sort_order: item.sort_order || 0, is_active: item.is_active !== false,
      starts_at: localDate(item.starts_at), ends_at: localDate(item.ends_at), image: null,
    });
    openDialog(); setError(""); setMessage("");
  };
  const change = (event) => {
    const { name, value, type, checked, files } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : type === "file" ? files?.[0] || null : value }));
  };
  const save = async (event) => {
    event.preventDefault();
    if (!editing && !form.image) { setError(t("admin.banners.requiredImage")); return; }
    setBusy(true); setError(""); setMessage("");
    const payload = { ...form, is_active: form.is_active ? 1 : 0, sort_order: Number(form.sort_order) };
    try {
      if (editing) await updateAdminBannerAPI(editing.id, payload);
      else await createAdminBannerAPI(payload);
      setMessage(t(editing ? "admin.banners.updated" : "admin.banners.created"));
      closeDialog(); setEditing(null); setForm(emptyForm); await load();
    } catch (err) { setError(Object.values(err?.response?.data?.errors || {}).flat()[0] || err?.response?.data?.message || t("admin.banners.saveError")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true); setError("");
    try { await deleteAdminBannerAPI(pendingDelete.id); setPendingDelete(null); setMessage(t("admin.banners.deleted")); await load(); }
    catch (err) { setError(err?.response?.data?.message || t("admin.banners.deleteError")); }
    finally { setBusy(false); }
  };

  return <main className="admin-page"><div className="container">
    <div className="admin-page__header"><div><h1 className="admin-page__title">{t("admin.banners.title")}</h1><p className="admin-page__subtitle">{t("admin.banners.subtitle")}</p></div><button className="admin-page__button" onClick={startCreate}>{t("admin.banners.add")}</button></div>
    {message && <div className="admin-page__message" role="status">{message}</div>}
    {error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}
    <section className="admin-page__panel">
      {busy && !items.length ? <AdminState type="loading" message={t("admin.common.loadingData")} /> : <div className="admin-page__table-wrap"><table className="admin-page__table"><thead><tr><th>{t("admin.common.image")}</th><th>{t("admin.banners.placement")}</th><th>{t("admin.common.name")}</th><th>{t("admin.banners.link")}</th><th>{t("admin.banners.schedule")}</th><th>{t("admin.banners.sortOrder")}</th><th>{t("admin.banners.active")}</th><th>{t("admin.common.actions")}</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td><img className="admin-page__image" src={item.image_url} alt={item.alt_text_vi} /></td><td>{t(item.placement === "hero" ? "admin.banners.hero" : "admin.banners.promo")}</td><td><strong>{item.title_vi || item.alt_text_vi}</strong><br/><small>{item.title_en}</small></td><td>{item.link_url || "—"}</td><td><small>{item.starts_at ? new Date(item.starts_at).toLocaleString() : t("admin.banners.now")}<br/>{item.ends_at ? new Date(item.ends_at).toLocaleString() : t("admin.banners.noEnd")}</small></td><td>{item.sort_order}</td><td><span className={`admin-page__badge${item.is_active ? "" : " admin-page__badge--danger"}`}>{t(item.is_active ? "admin.reviewsAdmin.visible" : "admin.reviewsAdmin.hidden")}</span></td><td><div className="admin-page__actions"><button className="admin-page__button admin-page__button--ghost" onClick={() => startEdit(item)}>{t("admin.common.edit")}</button>{isAdmin(user) && <button className="admin-page__button admin-page__button--danger" onClick={() => setPendingDelete(item)}>{t("admin.common.delete")}</button>}</div></td></tr>)}
        {!items.length && <tr><td colSpan="8" className="admin-page__empty">{t("admin.banners.empty")}</td></tr>}
      </tbody></table></div>}
    </section>
  </div>
  {open && <div className="admin-page__modal" role="dialog" aria-modal="true" aria-labelledby="banner-dialog-title" onKeyDown={onDialogKeyDown} onMouseDown={(event) => event.target === event.currentTarget && !busy && closeDialog()}><form className="admin-page__modal-form" onSubmit={save}><h2 id="banner-dialog-title" tabIndex={-1} ref={dialogTitle}>{t(editing ? "admin.banners.editTitle" : "admin.banners.createTitle")}</h2>
    <label>{t("admin.banners.placement")}<select name="placement" value={form.placement} onChange={change}><option value="hero">{t("admin.banners.hero")}</option><option value="home_promo">{t("admin.banners.promo")}</option></select></label>
    {[['title_vi','titleVi'],['title_en','titleEn'],['subtitle_vi','subtitleVi'],['subtitle_en','subtitleEn'],['button_label_vi','buttonVi'],['button_label_en','buttonEn'],['alt_text_vi','altVi'],['alt_text_en','altEn'],['link_url','link']].map(([name,key]) => <label key={name}>{t(`admin.banners.${key}`)}<input name={name} value={form[name]} onChange={change} required={name.startsWith('alt_text')} /></label>)}
    <div className="admin-page__form-grid"><label>{t("admin.banners.sortOrder")}<input type="number" min="0" name="sort_order" value={form.sort_order} onChange={change}/></label><label>{t("admin.banners.startsAt")}<input type="datetime-local" name="starts_at" value={form.starts_at} onChange={change}/></label><label>{t("admin.banners.endsAt")}<input type="datetime-local" name="ends_at" value={form.ends_at} onChange={change}/></label></div>
    <label>{t("admin.banners.image")}<input type="file" name="image" accept="image/jpeg,image/png,image/webp" onChange={change} required={!editing}/></label>{preview && <div className="admin-banner-previews"><figure><figcaption>{t("admin.banners.desktopPreview")}</figcaption><img className="admin-banner-previews__desktop" src={preview} alt={form.alt_text_vi || t("admin.banners.currentImage")}/></figure><figure><figcaption>{t("admin.banners.mobilePreview")}</figcaption><img className="admin-banner-previews__mobile" src={preview} alt={form.alt_text_vi || t("admin.banners.currentImage")}/></figure></div>}<label className="admin-page__checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={change}/>{t("admin.banners.active")}</label>
    <div className="admin-page__actions"><button className="admin-page__button" disabled={busy}>{t("admin.common.save")}</button><button type="button" className="admin-page__button admin-page__button--ghost" onClick={closeDialog} disabled={busy}>{t("admin.common.cancel")}</button></div>
  </form></div>}
  <ConfirmModal isOpen={Boolean(pendingDelete)} title={t("admin.common.confirmDelete")} message={t("admin.banners.confirmDelete")} onConfirm={remove} onCancel={() => setPendingDelete(null)} busy={busy}/>
  </main>;
}
export default memo(AdminBannersPage);
