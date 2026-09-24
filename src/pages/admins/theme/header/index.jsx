import { memo, useEffect, useRef, useState } from "react";
import {
  AiOutlineAppstore,
  AiOutlineBarChart,
  AiOutlineClose,
  AiOutlineDashboard,
  AiOutlineDown,
  AiOutlineEdit,
  AiOutlineExport,
  AiOutlineFileImage,
  AiOutlineLogout,
  AiOutlineMenu,
  AiOutlinePicture,
  AiOutlineShoppingCart,
  AiOutlineStar,
  AiOutlineTags,
  AiOutlineUser,
} from "react-icons/ai";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ROUTERS, STOREFRONT_URL } from "utils/router";
import { logoutAdminAPI } from "api/admin";
import { clearAdminSession, isAdmin } from "utils/adminAuth";
import { clearAuth, selectAdminUser } from "../../../../redux/authSlice";
import LanguageSwitcher from "component/LanguageSwitcher";
import "./style.scss";

const navigationGroups = [
  {
    key: "overview",
    icon: AiOutlineDashboard,
    items: [
      ["DASHBOARD", "dashboard", AiOutlineDashboard],
      ["ANALYTICS", "analytics", AiOutlineBarChart],
    ],
  },
  {
    key: "catalog",
    icon: AiOutlineAppstore,
    items: [
      ["PRODUCTS", "products", AiOutlineAppstore],
      ["MEDIA", "media", AiOutlineFileImage],
      ["CATEGORIES", "categories", AiOutlineTags],
    ],
  },
  {
    key: "content",
    icon: AiOutlinePicture,
    items: [
      ["BANNERS", "banners", AiOutlinePicture],
      ["SITE_CONTENT", "siteContent", AiOutlineEdit],
    ],
  },
  {
    key: "operations",
    icon: AiOutlineShoppingCart,
    items: [
      ["ORDERS", "orders", AiOutlineShoppingCart],
      ["REVIEWS", "reviews", AiOutlineStar],
      ["COUPONS", "coupons", AiOutlineTags],
    ],
  },
  {
    key: "system",
    icon: AiOutlineUser,
    adminOnly: true,
    items: [["USERS", "users", AiOutlineUser]],
  },
];

const groupForPath = (groups, pathname) => groups.find((group) =>
  group.items.some(([route]) => ROUTERS.ADMIN[route] === pathname)
)?.key;

function HeaderAD() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectAdminUser);
  const groups = navigationGroups.filter((group) => !group.adminOnly || isAdmin(user));
  const activeGroup = groupForPath(groups, location.pathname);
  const [expanded, setExpanded] = useState(() => activeGroup ? { [activeGroup]: true } : {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuButton = useRef(null);
  const closeButton = useRef(null);
  const sidebar = useRef(null);

  useEffect(() => {
    if (!activeGroup) return;
    setExpanded((current) => ({ ...current, [activeGroup]: true }));
  }, [activeGroup]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      requestAnimationFrame(() => menuButton.current?.focus());
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    requestAnimationFrame(() => closeButton.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const closeMenu = (restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButton.current?.focus());
  };

  const handleSidebarKeyDown = (event) => {
    if (!menuOpen) return;
    if (event.key !== "Tab") return;

    const controls = [...sidebar.current.querySelectorAll("a[href], button:not(:disabled)")];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

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
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="admin__header">
        <div className="container admin__header__top">
          <button
            ref={menuButton}
            type="button"
            className="admin__header__menu-button"
            aria-label={t("admin.navigation.openMenu")}
            aria-controls="admin-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <AiOutlineMenu aria-hidden="true" />
          </button>
          <NavLink to={ROUTERS.ADMIN.PRODUCTS} className="admin__header__mobile-brand">
            Farta <span>Admin</span>
          </NavLink>
          <div className="admin__header__account">
            <span className="admin__header__user">{user?.name}</span>
            <LanguageSwitcher />
            <a href={STOREFRONT_URL} target="_blank" rel="noopener noreferrer" aria-label={t("admin.viewStore")}>
              <AiOutlineExport aria-hidden="true" />
              <span className="admin__header__action-label">{t("admin.viewStore")}</span>
            </a>
            <button type="button" onClick={logout} disabled={busy} aria-label={t("admin.nav.logout")}>
              <AiOutlineLogout aria-hidden="true" />
              <span className="admin__header__action-label">{t("admin.nav.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      <button
        type="button"
        className={`admin__sidebar-backdrop${menuOpen ? " is-open" : ""}`}
        aria-label={t("admin.navigation.closeMenu")}
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => closeMenu()}
      />

      <aside
        id="admin-sidebar"
        ref={sidebar}
        className={`admin__sidebar${menuOpen ? " is-open" : ""}`}
        aria-label={t("admin.navigation.label")}
        aria-modal={menuOpen || undefined}
        role={menuOpen ? "dialog" : undefined}
        onKeyDown={handleSidebarKeyDown}
      >
        <div className="admin__sidebar-head">
          <NavLink to={ROUTERS.ADMIN.PRODUCTS} className="admin__sidebar-brand" onClick={() => closeMenu(false)}>
            Farta <span>Admin</span>
          </NavLink>
          <button
            ref={closeButton}
            type="button"
            className="admin__sidebar-close"
            aria-label={t("admin.navigation.closeMenu")}
            onClick={() => closeMenu()}
          >
            <AiOutlineClose aria-hidden="true" />
          </button>
        </div>

        <nav className="admin__sidebar-nav" aria-label={t("admin.navigation.label")}>
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = Boolean(expanded[group.key]);
            const panelId = `admin-nav-${group.key}`;
            return (
              <div className="admin__sidebar-group" key={group.key}>
                <button
                  type="button"
                  className={`admin__sidebar-group-button${activeGroup === group.key ? " is-active" : ""}`}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => setExpanded((current) => ({ ...current, [group.key]: !isExpanded }))}
                >
                  <GroupIcon aria-hidden="true" />
                  <span>{t(`admin.navigation.${group.key}`)}</span>
                  <AiOutlineDown className="admin__sidebar-chevron" aria-hidden="true" />
                </button>
                {isExpanded && (
                  <ul id={panelId} className="admin__sidebar-list">
                    {group.items.map(([route, label, Icon]) => (
                      <li key={route}>
                        <NavLink
                          to={ROUTERS.ADMIN[route]}
                          className={({ isActive }) => `admin__sidebar-link${isActive ? " is-active" : ""}`}
                          onClick={() => closeMenu(false)}
                        >
                          <Icon aria-hidden="true" />
                          <span>{t(`admin.nav.${label}`)}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default memo(HeaderAD);
