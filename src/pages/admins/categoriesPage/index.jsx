import { memo, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  createAdminCategoryAPI, deleteAdminCategoryAPI, deleteAdminCategoryImageAPI,
  getAdminCategoriesAPI, updateAdminCategoryAPI, uploadAdminCategoryImageAPI,
} from "api/admin";
import { AdminState, ConfirmModal } from "component";
import { isAdmin } from "utils/adminAuth";
import { selectAdminUser } from "../../../redux/authSlice";
import { translateCategoryName } from "utils/i18nLabels";
import "../admin.scss";

const emptyForm = { name: "", description: "", sort_order: 0, is_active: true };

function AdminCategoriesPage() {
  const { t } = useTranslation();
  const adminUser = useSelector(selectAdminUser);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [image, setImage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canDelete = isAdmin(adminUser);

  const load = async () => { setBusy(true); setError(""); try { setCategories(await getAdminCategoriesAPI()); } catch (err) { setError(err?.response?.data?.message || t("admin.categories.loadError")); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const reset = () => { setEditing(null); setForm(emptyForm); setImage(null); };
  const edit = (category) => { setEditing(category); setForm({ name: category.name || "", description: category.description || "", sort_order: category.sort_order || 0, is_active: category.is_active !== false }); setImage(null); };
  const change = (event) => { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value })); };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    let saved = null;
    try {
      const payload = { ...form, sort_order: Number(form.sort_order), is_active: form.is_active };
      saved = editing ? await updateAdminCategoryAPI(editing.id, payload) : await createAdminCategoryAPI(payload);
      if (image) await uploadAdminCategoryImageAPI(saved.id, image);
      setMessage(t(editing ? "admin.categories.updated" : "admin.categories.created")); reset(); await load();
    } catch (err) {
      if (saved) {
        setEditing(saved);
        setForm({ name: saved.name || "", description: saved.description || "", sort_order: saved.sort_order || 0, is_active: saved.is_active !== false });
        setImage(null);
        await load();
      }
      setError(Object.values(err?.response?.data?.errors || {}).flat()[0] || err?.response?.data?.message || t(saved ? "admin.categories.imageUploadError" : "admin.categories.saveError"));
    }
    finally { setBusy(false); }
  };
  const remove = async () => { if (!pendingDelete) return; setBusy(true); try { await deleteAdminCategoryAPI(pendingDelete.id); setPendingDelete(null); setMessage(t("admin.categories.deleted")); if (editing?.id === pendingDelete.id) reset(); await load(); } catch (err) { setError(err?.response?.data?.message || t("admin.categories.deleteError")); } finally { setBusy(false); } };
  const removeImage = async () => { if (!editing) return; setBusy(true); try { const updated = await deleteAdminCategoryImageAPI(editing.id); setEditing(updated); setMessage(t("admin.categories.imageRemoved")); await load(); } catch (err) { setError(err?.response?.data?.message || t("admin.categories.saveError")); } finally { setBusy(false); } };

  return <main className="admin-page"><div className="container"><div className="admin-page__header"><div><h1 className="admin-page__title">{t("admin.categories.title")}</h1><p className="admin-page__subtitle">{t("admin.categories.subtitle")}</p></div></div>
    {message && <div className="admin-page__message" role="status">{message}</div>}{error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}
    <div className="admin-page__grid"><section className="admin-page__panel"><h2 className="admin-page__panel-title">{t(editing ? "admin.categories.updateTitle" : "admin.categories.createTitle")}</h2><form className="admin-page__form" onSubmit={save}><label>{t("admin.categories.name")}<input name="name" value={form.name} onChange={change} required/></label><label>{t("admin.categories.description")}<textarea name="description" value={form.description} onChange={change}/></label><label>{t("admin.categories.sortOrder")}<input type="number" min="0" name="sort_order" value={form.sort_order} onChange={change}/></label><label className="admin-page__checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={change}/>{t("admin.categories.active")}</label><label>{t("admin.categories.image")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)}/></label>{editing?.image_url && <div><img className="admin-page__preview" src={editing.image_url} alt={editing.name}/>{canDelete && <button type="button" className="admin-page__button admin-page__button--danger" onClick={removeImage} disabled={busy}>{t("admin.categories.removeImage")}</button>}</div>}<div className="admin-page__actions"><button className="admin-page__button" disabled={busy}>{t(editing ? "admin.common.saveChanges" : "admin.categories.createButton")}</button>{editing && <button type="button" className="admin-page__button admin-page__button--ghost" onClick={reset} disabled={busy}>{t("admin.common.cancel")}</button>}</div></form></section>
      <section className="admin-page__panel"><h2 className="admin-page__panel-title">{t("admin.categories.listTitle")}</h2><div className="admin-page__table-wrap"><table className="admin-page__table"><thead><tr><th>{t("admin.common.image")}</th><th>{t("admin.common.name")}</th><th>{t("admin.categories.productCount")}</th><th>{t("admin.categories.sortOrder")}</th><th>{t("admin.categories.active")}</th><th>{t("admin.common.actions")}</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td>{category.image_url ? <img className="admin-page__image" src={category.image_url} alt={category.name}/> : "—"}</td><td><strong>{translateCategoryName(category.name, t)}</strong><br/><small>{category.description}</small></td><td>{category.products_count || 0}</td><td>{category.sort_order}</td><td><span className={`admin-page__badge${category.is_active ? "" : " admin-page__badge--danger"}`}>{t(category.is_active ? "admin.reviewsAdmin.visible" : "admin.reviewsAdmin.hidden")}</span></td><td><div className="admin-page__actions"><button className="admin-page__button admin-page__button--ghost" onClick={() => edit(category)}>{t("admin.common.edit")}</button>{canDelete && <button className="admin-page__button admin-page__button--danger" onClick={() => setPendingDelete(category)}>{t("admin.common.delete")}</button>}</div></td></tr>)}{!categories.length && !busy && <tr><td colSpan="6" className="admin-page__empty">{t("admin.categories.empty")}</td></tr>}{busy && !categories.length && <tr><td colSpan="6"><AdminState type="loading" message={t("admin.common.loadingData")}/></td></tr>}</tbody></table></div></section>
    </div></div><ConfirmModal isOpen={Boolean(pendingDelete)} title={t("admin.categories.confirmDeleteTitle")} message={t("admin.categories.confirmDeleteMessage", { name: pendingDelete?.name || "" })} onConfirm={remove} onCancel={() => setPendingDelete(null)} busy={busy}/></main>;
}
export default memo(AdminCategoriesPage);
