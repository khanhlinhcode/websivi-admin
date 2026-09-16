import { memo, useState } from "react";
import { AiOutlineAppstore, AiOutlineDashboard, AiOutlineShoppingCart, AiOutlineTags, AiOutlineUser, AiOutlineLogout, AiOutlineExport, AiOutlinePicture, AiOutlineEdit, AiOutlineStar, AiOutlineBarChart } from "react-icons/ai";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ROUTERS, STOREFRONT_URL } from "utils/router";
import { logoutAdminAPI } from "api/admin";
import { clearAdminSession, isAdmin } from "utils/adminAuth";
import { clearAuth, selectAdminUser } from "../../../../redux/authSlice";
import LanguageSwitcher from "component/LanguageSwitcher";
import "./style.scss";

function HeaderAD() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectAdminUser);
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logoutAdminAPI();
      clearAdminSession();
      dispatch(clearAuth());
      navigate(ROUTERS.ADMIN.LOGIN, { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(clearAuth());
        navigate(ROUTERS.ADMIN.LOGIN, { replace: true });
      } else toast.error(t("admin.logoutError"));
    } finally { setBusy(false); }
  };
  const items = [
    ["PRODUCTS", "products", AiOutlineAppstore],
    ["CATEGORIES", "categories", AiOutlineTags],
    ["BANNERS", "banners", AiOutlinePicture],
    ["SITE_CONTENT", "siteContent", AiOutlineEdit],
    ["ORDERS", "orders", AiOutlineShoppingCart],
    ["REVIEWS", "reviews", AiOutlineStar],
    ["DASHBOARD", "dashboard", AiOutlineDashboard],
    ["ANALYTICS", "analytics", AiOutlineBarChart],
    ["COUPONS", "coupons", AiOutlineTags],
    ...(isAdmin(user) ? [["USERS", "users", AiOutlineUser]] : []),
  ];
  return (
    <header className="admin__header">
      <div className="container">
        <div className="admin__header__top">
          <NavLink to={ROUTERS.ADMIN.PRODUCTS} className="admin__header__brand">Farta <span>Admin</span></NavLink>
          <div className="admin__header__account">
            <span className="admin__header__user">{user?.name}</span>
            <LanguageSwitcher />
            <a href={STOREFRONT_URL} target="_blank" rel="noopener noreferrer"><AiOutlineExport aria-hidden="true" />{t("admin.viewStore")}</a>
            <button type="button" onClick={logout} disabled={busy}><AiOutlineLogout aria-hidden="true" />{t("admin.nav.logout")}</button>
          </div>
        </div>
        <nav className="admin__header__nav" aria-label="Admin">
          {items.map(([key, label, Icon]) => (
            <NavLink key={key} to={ROUTERS.ADMIN[key]} className={({ isActive }) => `admin__header__nav-item${isActive ? " admin__header__nav-item--active" : ""}`}>
              <Icon aria-hidden="true" />{t(`admin.nav.${label}`)}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
export default memo(HeaderAD);
