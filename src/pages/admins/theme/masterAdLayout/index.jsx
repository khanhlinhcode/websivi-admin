import { memo } from "react";
import { ROUTERS } from "utils/router";
import { useLocation } from "react-router-dom";
import HeaderAD from "../header";

const MasterADLayout = ({ children, ...props }) => {
  const location = useLocation();
  const isLoginPage = location.pathname.startsWith(ROUTERS.ADMIN.LOGIN);
  if (isLoginPage) return children;

  return (
    <div className="admin-shell" {...props}>
      <HeaderAD />
      <div className="admin-shell__content">{children}</div>
    </div>
  );
};
export default memo(MasterADLayout);
