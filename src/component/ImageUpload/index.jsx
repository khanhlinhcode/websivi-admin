import { memo, useEffect, useRef, useState } from "react";
import {
  deleteAdminProductImageAPI,
  reorderAdminProductImagesAPI,
  setAdminProductPrimaryImageAPI,
  uploadAdminProductImageAPI,
  uploadAdminProductImagesAPI,
} from "api/admin";
import { resolveProductImage } from "utils/productImages";
import { useTranslation } from "react-i18next";
import ConfirmModal from "component/ConfirmModal";
import "./style.scss";

function ImageUpload({ productId, value, images = [], onUploaded, onDeleted, onBusyChange, disabled = false }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState("gallery");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const input = useRef(null);
  const locked = disabled || busy || !productId;

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const changeMode = (event) => { setMode(event.target.value); setFiles([]); input.current.value = ""; };
  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    setError(""); setMessage("");
    if (selected.length > (mode === "primary" ? 1 : 8) || selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setError(t("admin.products.invalidFiles")); setFiles([]); event.target.value = ""; return;
    }
    setFiles(selected);
  };
  const start = () => { setBusy(true); onBusyChange?.(true); setError(""); setMessage(""); };
  const finish = () => { setBusy(false); onBusyChange?.(false); };
  const fail = (err) => setError(Object.values(err?.response?.data?.errors || {}).flat()[0] || err?.response?.data?.message || t("admin.products.uploadError"));
  const upload = async () => {
    if (locked || !files.length) return;
    start();
    try {
      const response = mode === "primary"
        ? await uploadAdminProductImageAPI(productId, files[0])
        : await uploadAdminProductImagesAPI(productId, files);
      onUploaded(response.product.img, response.product);
      setFiles([]); input.current.value = ""; setMessage(t("admin.uploadSuccess"));
    } catch (err) { fail(err); } finally { finish(); }
  };
  const remove = async () => {
    if (locked || !pendingDelete) return;
    start();
    try {
      const response = await deleteAdminProductImageAPI(pendingDelete.id);
      onDeleted(response.product); setMessage(t("admin.products.imageDeleted"));
    } catch (err) { fail(err); } finally { setPendingDelete(null); finish(); }
  };

  const makePrimary = async (image) => {
    if (locked || image.is_primary) return;
    start();
    try {
      const response = await setAdminProductPrimaryImageAPI(image.id);
      onDeleted(response.product);
      setMessage(t("admin.products.primaryUpdated"));
    } catch (err) {
      fail(err);
    } finally {
      finish();
    }
  };

  const move = async (index, offset) => {
    const nextIndex = index + offset;
    if (locked || nextIndex < 0 || nextIndex >= images.length) return;

    const ordered = [...images];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    start();
    try {
      const response = await reorderAdminProductImagesAPI(
        productId,
        ordered.map((image) => image.id)
      );
      onDeleted(response.product);
      setMessage(t("admin.products.imageOrderUpdated"));
    } catch (err) {
      fail(err);
    } finally {
      finish();
    }
  };
  return (
    <section className="image-upload" aria-label={t("admin.products.gallery")} aria-busy={busy}>
      <h3>{t("admin.products.gallery")}</h3>
      <div className="image-upload__cover">
        <img src={resolveProductImage(value)} alt={t("admin.products.primary")} />
        <span>{t("admin.products.primary")}</span>
      </div>
      {!productId ? <p>{t("admin.products.saveBeforeUpload")}</p> : <>
        <div className="image-upload__mode">
          <label><input type="radio" name="image-mode" value="gallery" checked={mode === "gallery"} onChange={changeMode} disabled={locked} />{t("admin.products.addImages")}</label>
          <label><input type="radio" name="image-mode" value="primary" checked={mode === "primary"} onChange={changeMode} disabled={locked} />{t("admin.products.replacePrimary")}</label>
        </div>
        {mode === "primary" && <p>{t("admin.products.replaceHelp")}</p>}
        <label className="image-upload__choose">{t("admin.products.chooseFiles")}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={mode === "gallery"} disabled={locked} onChange={selectFiles} aria-describedby="image-help" />
        </label>
        <p id="image-help">{t("admin.products.imageHelp")}</p>
        {files.length > 0 && <div className="image-upload__previews">
          {previews.map((url, i) => <img key={url} src={url} alt={files[i]?.name || ""} />)}
          <p>{t("admin.products.selectedFiles", { count: files.length })}</p>
        </div>}
        <button type="button" className="admin-page__button" disabled={locked || !files.length} onClick={upload}>
          {busy ? t("admin.products.uploading") : t("admin.products.uploadImages")}
        </button>
        {images.length ? <ul className="image-upload__gallery">
          {images.map((image, index) => <li key={image.id}>
            <img src={resolveProductImage(image.url)} alt={`${t("admin.products.image")} ${index + 1}`} />
            <span>{image.is_primary ? t("admin.products.primary") : `${t("admin.products.image")} ${index + 1}`}</span>
            <div className="image-upload__actions">
              {!image.is_primary && (
                <button type="button" onClick={() => makePrimary(image)} disabled={locked}>
                  {t("admin.products.makePrimary")}
                </button>
              )}
              <button type="button" onClick={() => move(index, -1)} disabled={locked || index === 0} aria-label={`${t("admin.products.moveUp")} ${index + 1}`}>
                {t("admin.products.moveUp")}
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={locked || index === images.length - 1} aria-label={`${t("admin.products.moveDown")} ${index + 1}`}>
                {t("admin.products.moveDown")}
              </button>
              <button type="button" className="image-upload__delete" onClick={() => setPendingDelete(image)} disabled={locked} aria-label={`${t("admin.products.deleteImage")} ${index + 1}`}>
                {t("admin.products.deleteImage")}
              </button>
            </div>
          </li>)}
        </ul> : <p>{t("admin.products.noImages")}</p>}
      </>}
      {error && <p className="image-upload__error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <ConfirmModal isOpen={Boolean(pendingDelete)} title={t("admin.products.deleteImageTitle")} message={t("admin.products.deleteImageMessage")} onConfirm={remove} onCancel={() => !busy && setPendingDelete(null)} busy={busy} />
    </section>
  );
}
export default memo(ImageUpload);
