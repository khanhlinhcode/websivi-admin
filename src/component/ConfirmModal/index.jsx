import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./style.scss";

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, busy = false }) => {
  const { t } = useTranslation();

  const dialog = useRef(null);
  const cancel = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => previous?.focus();
  }, [isOpen]);
  const onKeyDown = (event) => {
    if (event.key === "Escape" && !busy) onCancel();
    if (event.key === "Tab") {
      const buttons = [...dialog.current.querySelectorAll("button:not(:disabled)")];
      if (!buttons.length) { event.preventDefault(); return; }
      const target = event.shiftKey ? buttons.at(-1) : buttons[0];
      const edge = event.shiftKey ? buttons[0] : buttons.at(-1);
      if (document.activeElement === edge) { event.preventDefault(); target.focus(); }
    }
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div ref={dialog} onKeyDown={onKeyDown} className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="confirm-modal__backdrop" onClick={() => !busy && onCancel()} />
      <div className="confirm-modal__content">
        <h2 id="confirm-modal-title">{title || t("confirm.title")}</h2>
        <p>{message || t("confirm.message")}</p>
        <div className="confirm-modal__actions">
          <button type="button" ref={cancel} disabled={busy} className="confirm-modal__button confirm-modal__button--ghost" onClick={() => !busy && onCancel()}>
            {t("confirm.cancel")}
          </button>
          <button type="button" disabled={busy} className="confirm-modal__button confirm-modal__button--danger" onClick={onConfirm}>
            {t("confirm.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default memo(ConfirmModal);
