import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { selectAdminUser, selectAuthBootstrapped } from "./redux/authSlice";
import { hasAdminAccess, isAdmin } from "utils/adminAuth";
import { ROUTERS } from "utils/router";
import MasterAdLayout from "pages/admins/theme/masterAdLayout";
import AdminState from "component/AdminState";

const Login = lazy(() => import("pages/admins/loginPage"));
const Products = lazy(() => import("pages/admins/productsPage"));
const Dashboard = lazy(() => import("pages/admins/dashboardPage"));
const Orders = lazy(() => import("pages/admins/ordersPage"));
const Categories = lazy(() => import("pages/admins/categoriesPage"));
const Coupons = lazy(() => import("pages/admins/couponsPage"));
const Users = lazy(() => import("pages/admins/usersPage"));
const Banners = lazy(() => import("pages/admins/bannersPage"));
const SiteContent = lazy(() => import("pages/admins/siteContentPage"));
const Reviews = lazy(() => import("pages/admins/reviewsPage"));
const Analytics = lazy(() => import("pages/admins/analyticsPage"));

class RouteErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <AdminState type="error" message={this.props.message} actionLabel={this.props.retry} onAction={() => window.location.reload()} />
      : this.props.children;
  }
}

export default function Router() {
  const user = useSelector(selectAdminUser);
  const ready = useSelector(selectAuthBootstrapped);
  const location = useLocation();
  const { t } = useTranslation();
  if (!ready) return <AdminState type="loading" message={t("common.loading")} />;
  const protect = (element, adminOnly = false) => {
    if (!hasAdminAccess(user)) return <Navigate to={`${ROUTERS.ADMIN.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    if (adminOnly && !isAdmin(user)) return <AdminState type="error" message={t("admin.accessDenied")} />;
    return <MasterAdLayout>{element}</MasterAdLayout>;
  };
  return (
    <RouteErrorBoundary key={location.pathname} message={t("common.error")} retry={t("common.retry")}>
      <Suspense fallback={<AdminState type="loading" message={t("common.loading")} />}>
        <Routes>
          <Route path={ROUTERS.ADMIN.LOGIN} element={<Login />} />
          <Route path={ROUTERS.ADMIN.PRODUCTS} element={protect(<Products />)} />
          <Route path={ROUTERS.ADMIN.DASHBOARD} element={protect(<Dashboard />)} />
          <Route path={ROUTERS.ADMIN.ORDERS} element={protect(<Orders />)} />
          <Route path={ROUTERS.ADMIN.CATEGORIES} element={protect(<Categories />)} />
          <Route path={ROUTERS.ADMIN.COUPONS} element={protect(<Coupons />)} />
          <Route path={ROUTERS.ADMIN.USERS} element={protect(<Users />, true)} />
          <Route path={ROUTERS.ADMIN.BANNERS} element={protect(<Banners />)} />
          <Route path={ROUTERS.ADMIN.SITE_CONTENT} element={protect(<SiteContent />)} />
          <Route path={ROUTERS.ADMIN.REVIEWS} element={protect(<Reviews />)} />
          <Route path={ROUTERS.ADMIN.ANALYTICS} element={protect(<Analytics />)} />
          <Route path="*" element={<Navigate to={ROUTERS.ADMIN.PRODUCTS} replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
