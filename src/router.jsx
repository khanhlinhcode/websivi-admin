import React, { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { selectAdminUser, selectAuthBootstrapped } from "./redux/authSlice";
import { hasAdminAccess, isAdmin } from "utils/adminAuth";
import { ROUTERS } from "utils/router";
import MasterAdLayout from "pages/admins/theme/masterAdLayout";
import AdminState from "component/AdminState";

const Login = lazy(() => import("pages/admins/loginPage"));
const Products = lazy(() => import("pages/admins/productsPage"));
const Media = lazy(() => import("pages/admins/mediaPage"));
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
  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed
      ? <AdminState type="error" message={this.props.message} actionLabel={this.props.retry} onAction={() => window.location.reload()} />
      : this.props.children;
  }
}

function AdminRouteContent() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <RouteErrorBoundary
      resetKey={location.pathname}
      message={t("common.error")}
      retry={t("common.retry")}
    >
      <Suspense fallback={<AdminState type="loading" message={t("common.loading")} />}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default function Router() {
  const user = useSelector(selectAdminUser);
  const ready = useSelector(selectAuthBootstrapped);
  const location = useLocation();
  const { t } = useTranslation();
  if (!ready) return <AdminState type="loading" message={t("common.loading")} />;
  const protectedLayout = hasAdminAccess(user)
    ? <MasterAdLayout><AdminRouteContent /></MasterAdLayout>
    : <Navigate to={`${ROUTERS.ADMIN.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} replace />;

  return (
    <Routes>
      <Route
        path={ROUTERS.ADMIN.LOGIN}
        element={<Suspense fallback={<AdminState type="loading" message={t("common.loading")} />}><Login /></Suspense>}
      />
      <Route element={protectedLayout}>
        <Route path={ROUTERS.ADMIN.PRODUCTS} element={<Products />} />
        <Route path={ROUTERS.ADMIN.MEDIA} element={<Media />} />
        <Route path={ROUTERS.ADMIN.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTERS.ADMIN.ORDERS} element={<Orders />} />
        <Route path={ROUTERS.ADMIN.CATEGORIES} element={<Categories />} />
        <Route path={ROUTERS.ADMIN.COUPONS} element={<Coupons />} />
        <Route path={ROUTERS.ADMIN.USERS} element={isAdmin(user) ? <Users /> : <AdminState type="error" message={t("admin.accessDenied")} />} />
        <Route path={ROUTERS.ADMIN.BANNERS} element={<Banners />} />
        <Route path={ROUTERS.ADMIN.SITE_CONTENT} element={<SiteContent />} />
        <Route path={ROUTERS.ADMIN.REVIEWS} element={<Reviews />} />
        <Route path={ROUTERS.ADMIN.ANALYTICS} element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTERS.ADMIN.PRODUCTS} replace />} />
    </Routes>
  );
}
