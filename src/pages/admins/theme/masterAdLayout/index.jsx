import { memo } from "react";
import { ROUTERS } from "utils/router";
import { useLocation } from "react-router-dom";
import HeaderAD from "../header";

const MasterADLayout = ({ children, ...props }) => {
  const location = useLocation();
  const isLoginPage = location.pathname.startsWith(ROUTERS.ADMIN.LOGIN);
  return (
    <div {...props}>
      {!isLoginPage && <HeaderAD />}
      {children}
    </div>
  );
};
export default memo(MasterADLayout);
