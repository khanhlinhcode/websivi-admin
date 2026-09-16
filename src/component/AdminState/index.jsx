import { memo } from "react";
import "./style.scss";

const AdminState = ({ actionLabel, message, onAction, title, type = "empty" }) => {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <div className={`admin-state admin-state--${type}`} role={type === "error" ? "alert" : "status"}>
      <span className="admin-state__icon" aria-hidden="true" />
      {title && <strong>{title}</strong>}
      {message && <span>{message}</span>}
      {showAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default memo(AdminState);
