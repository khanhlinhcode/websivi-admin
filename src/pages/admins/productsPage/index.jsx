import { memo, useEffect, useRef, useState } from "react";
import {
  createAdminProductAPI,
  deleteAdminProductAPI,
  getAdminCategoriesAPI,
  getAdminProductsAPI,
  updateAdminProductAPI,
} from "api/admin";
import { AdminState, ConfirmModal, ImageUpload } from "component";
import { formatter } from "utils/formatter";
import { resolveProductImage } from "utils/productImages";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { isAdmin } from "utils/adminAuth";
import { selectAdminUser } from "../../../redux/authSlice";
import { translateCategoryName } from "utils/i18nLabels";
import { STOREFRONT_URL } from "utils/router";
import "../admin.scss";

const emptyProductForm = {
  name: "",
  slug: "",
  img: "",
  price: 0,
  inventory: 0,
  is_active: true,
  category_id: "",
  sort_description: "",
  description: "",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  images: [],
};

const AdminProductsPage = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProductForm);
  const [showEditor, setShowEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageBusy, setIsImageBusy] = useState(false);
  const busy = isSaving || isImageBusy;
  const editorTitle = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    category_id: "",
    active: "",
    in_stock: "",
  });
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const adminUser = useSelector(selectAdminUser);
  const canDelete = isAdmin(adminUser);

  const loadData = async (page = 1, nextFilters = filters) => {
    setIsLoading(true);
    setError("");

    try {
      const [productsResponse, categoriesData] = await Promise.all([
        getAdminProductsAPI({
          page,
          per_page: 20,
          q: nextFilters.q.trim() || undefined,
          category_id: nextFilters.category_id || undefined,
          active: nextFilters.active === "" ? undefined : nextFilters.active,
          in_stock:
            nextFilters.in_stock === "" ? undefined : nextFilters.in_stock,
        }),
        getAdminCategoriesAPI(),
      ]);
      const productItems = Array.isArray(productsResponse)
        ? productsResponse
        : productsResponse?.data || [];
      setProducts(productItems);
      setMeta(
        productsResponse?.meta || {
          current_page: 1,
          last_page: 1,
          total: productItems.length,
        }
      );
      setCategories(categoriesData);
      setForm((prev) => ({
        ...prev,
        category_id: prev.category_id || categoriesData[0]?.id || "",
      }));
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.products.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    if (showEditor) editorTitle.current?.focus();
  }, [showEditor, editingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadData(1);
  };

  const resetFilters = () => {
    const emptyFilters = { q: "", category_id: "", active: "", in_stock: "" };
    setFilters(emptyFilters);
    loadData(1, emptyFilters);
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditingId(null);
    setForm({
      ...emptyProductForm,
      category_id: categories[0]?.id || "",
    });
  };

  const toPayload = () => {
    const { images: _images, img: _img, ...values } = form;

    return {
      ...values,
      price: Number(form.price),
      inventory: Number(form.inventory),
      is_active: Boolean(form.is_active),
      category_id: Number(form.category_id),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await updateAdminProductAPI(editingId, toPayload());
        setMessage(t("admin.products.updated"));
      } else {
        const created = await createAdminProductAPI(toPayload());
        handleEdit(created);
        setMessage(t("admin.products.created"));
      }

      if (editingId) resetForm();
      await loadData(editingId ? meta.current_page : 1);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.products.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setShowEditor(true);
    setMessage(""); setError("");
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      img: product.img ?? "",
      price: product.price || 0,
      inventory: product.inventory || 0,
      is_active: product.is_active !== false,
      category_id: product.category_id || "",
      sort_description: product.sort_description || "",
      description: product.description || "",
      facebook: product.facebook || "",
      twitter: product.twitter || "",
      instagram: product.instagram || "",
      linkedin: product.linkedin || "",
      images: product.images || [],
    });
  };

  const updateImages = (updatedProduct) => {
    setForm((prev) => ({ ...prev, img: updatedProduct.img ?? "", images: updatedProduct.images || [] }));
    setProducts((prev) => prev.map((product) => product.id === updatedProduct.id ? updatedProduct : product));
  };

  const handleDelete = async (product) => {
    setPendingDeleteProduct(product);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct || busy) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    try {
      await deleteAdminProductAPI(pendingDeleteProduct.id);
      setMessage(t("admin.products.deleted"));
      setPendingDeleteProduct(null);
      if (editingId === pendingDeleteProduct.id) resetForm();
      const nextPage =
        products.length === 1 && meta.current_page > 1
          ? meta.current_page - 1
          : meta.current_page;
      await loadData(nextPage);
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.products.deleteError"));
    } finally { setIsSaving(false); }
  };

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{t("admin.products.title")}</h1>
            <p className="admin-page__subtitle">
              {t("admin.products.subtitle")}
            </p>
          </div>
          <div className="admin-page__actions">
          <button className="admin-page__button" disabled={busy} onClick={() => { resetForm(); setShowEditor(true); }}>{t("admin.products.addNew")}</button>
          <button
            disabled={busy || isLoading}
            className="admin-page__button admin-page__button--ghost"
            onClick={() => loadData(meta.current_page)}
          >
            {t("admin.common.refresh")}
          </button>
          </div>
        </div>

        {message && <div className="admin-page__message" role="status">{message}</div>}
        {error && <div className="admin-page__message admin-page__message--error" role="alert">{error}</div>}

        <div className="admin-products">
          {showEditor && <section className="admin-page__panel admin-products__editor">
            <h2 className="admin-page__panel-title" tabIndex={-1} ref={editorTitle}>
              {editingId ? t("admin.products.updateTitle") : t("admin.products.createTitle")}
            </h2>
            <div className="admin-products__edit-grid">
            <form onSubmit={handleSubmit}>
            <fieldset className="admin-page__form" disabled={busy}>
              <label>
                {t("admin.products.name")}
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label>
                {t("admin.products.slug")}
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="cam-tuoi"
                />
              </label>
              <label>
                {t("admin.products.category")}
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {translateCategoryName(category.name, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("admin.products.price")}
                <input
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                {t("admin.products.inventory")}
                <input
                  name="inventory"
                  type="number"
                  min="0"
                  value={form.inventory}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="admin-page__checkbox">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                />
                <span>{t("admin.products.active")}</span>
              </label>
              <label>
                {t("admin.products.shortDescription")}
                <textarea
                  name="sort_description"
                  value={form.sort_description}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                {t("admin.products.description")}
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </label>
              <div className="admin-page__actions">
                <button className="admin-page__button" type="submit">
                  {editingId
                    ? t("admin.common.saveChanges")
                    : t("admin.products.createButton")}
                </button>
                {showEditor && (
                  <button
                    className="admin-page__button admin-page__button--ghost"
                    type="button"
                    onClick={resetForm}
                  >
                    {t("admin.common.cancel")}
                  </button>
                )}
              </div>
            </fieldset>
            </form>
            <ImageUpload
              key={editingId || "new"}
              productId={editingId}
              value={form.img}
              images={form.images}
              disabled={isSaving}
              onBusyChange={setIsImageBusy}
              onUploaded={(_, product) => updateImages(product)}
              onDeleted={updateImages}
            />
            </div>
          </section>}

          <div className="admin-page__panel">
            <h2 className="admin-page__panel-title">{t("admin.products.listTitle")}</h2>
            <form className="admin-page__toolbar" onSubmit={handleSearch}>
              <input
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                placeholder={t("admin.products.searchPlaceholder")}
                aria-label={t("admin.products.searchPlaceholder")}
              />
              <select
                name="category_id"
                value={filters.category_id}
                onChange={handleFilterChange}
                aria-label={t("admin.products.category")}
              >
                <option value="">{t("admin.products.allCategories")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {translateCategoryName(category.name, t)}
                  </option>
                ))}
              </select>
              <select
                name="active"
                value={filters.active}
                onChange={handleFilterChange}
                aria-label={t("admin.products.activeShort")}
              >
                <option value="">{t("admin.products.allVisibility")}</option>
                <option value="1">{t("admin.products.visible")}</option>
                <option value="0">{t("admin.products.hidden")}</option>
              </select>
              <select
                name="in_stock"
                value={filters.in_stock}
                onChange={handleFilterChange}
                aria-label={t("admin.products.stockShort")}
              >
                <option value="">{t("admin.products.allStock")}</option>
                <option value="1">{t("admin.products.inStock")}</option>
                <option value="0">{t("admin.products.outOfStock")}</option>
              </select>
              <button className="admin-page__button" type="submit" disabled={isLoading || busy}>
                {t("admin.common.search")}
              </button>
              <button
                className="admin-page__button admin-page__button--ghost"
                type="button"
                disabled={isLoading || busy}
                onClick={resetFilters}
              >
                {t("admin.products.resetFilters")}
              </button>
            </form>
            <div className="admin-page__table-wrap">
              <table className="admin-page__table">
                <thead>
                  <tr>
                    <th>{t("admin.common.image")}</th>
                    <th>{t("admin.products.name")}</th>
                    <th>{t("admin.products.category")}</th>
                    <th>{t("admin.products.price")}</th>
                    <th>{t("admin.products.stockShort")}</th>
                    <th>{t("admin.products.activeShort")}</th>
                    <th>{t("admin.common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="admin-products__row">
                      <td className="admin-products__cell-image">
                        <img
                          className="admin-page__image"
                          src={resolveProductImage(product.img)}
                          alt={product.name}
                        />
                      </td>
                      <td className="admin-products__cell-name">
                        <strong>{product.name}</strong>
                        <br />
                        <span>{product.sort_description}</span>
                      </td>
                      <td className="admin-products__cell-meta" data-label={t("admin.products.category")}>
                        {product.category?.name
                          ? translateCategoryName(product.category.name, t)
                          : t("common.noCategory")}
                      </td>
                      <td className="admin-products__cell-meta" data-label={t("admin.products.price")}>{formatter(product.price)}</td>
                      <td className="admin-products__cell-meta" data-label={t("admin.products.stockShort")}>{product.inventory}</td>
                      <td className="admin-products__cell-meta" data-label={t("admin.products.activeShort")}>
                        <span
                          className={`admin-page__badge${
                            product.is_active === false
                              ? " admin-page__badge--danger"
                              : ""
                          }`}
                        >
                          {product.is_active === false
                            ? t("admin.products.hidden")
                            : t("admin.products.visible")}
                        </span>
                      </td>
                      <td className="admin-products__cell-actions">
                        <div className="admin-page__actions">
                          <button
                            className="admin-page__button admin-page__button--ghost"
                            disabled={busy}
                            onClick={() => handleEdit(product)}
                          >
                            {t("admin.common.edit")}
                          </button>
                          {product.is_active !== false && <a className="admin-page__product-link" href={`${STOREFRONT_URL}/san-pham/chi-tiet/${product.id}`} target="_blank" rel="noopener noreferrer">{t("admin.products.viewProduct")}</a>}
                          {canDelete && (
                            <button
                              className="admin-page__button admin-page__button--danger"
                              disabled={busy}
                              onClick={() => handleDelete(product)}
                            >
                              {t("admin.common.delete")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!products.length && !isLoading && (
                    <tr>
                      <td colSpan={7} className="admin-page__empty">
                        <AdminState message={t("admin.products.empty")} />
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
                  disabled={meta.current_page <= 1 || isLoading || busy}
                  onClick={() => loadData(meta.current_page - 1)}
                >
                  {t("admin.common.previous")}
                </button>
                <span>
                  {t("admin.common.pageStatus", {
                    current: meta.current_page,
                    last: meta.last_page,
                    total: meta.total,
                  })}
                </span>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page || isLoading || busy}
                  onClick={() => loadData(meta.current_page + 1)}
                >
                  {t("admin.common.next")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingDeleteProduct)}
        title={t("admin.products.confirmDeleteTitle")}
        message={t("admin.products.confirmDeleteMessage", {
          name: pendingDeleteProduct?.name || "",
        })}
        onConfirm={confirmDeleteProduct}
        onCancel={() => !busy && setPendingDeleteProduct(null)}
        busy={busy}
      />
    </main>
  );
};

export default memo(AdminProductsPage);
