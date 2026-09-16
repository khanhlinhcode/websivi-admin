export const ROUTERS = {
  ADMIN: {
    LOGIN: "/dang-nhap",
    PRODUCTS: "/san-pham",
    DASHBOARD: "/dashboard",
    ORDERS: "/don-hang",
    CATEGORIES: "/danh-muc",
    COUPONS: "/ma-giam-gia",
    USERS: "/nguoi-dung",
    BANNERS: "/banner",
    SITE_CONTENT: "/noi-dung-web",
    REVIEWS: "/danh-gia",
    ANALYTICS: "/phan-tich",
  },
};

export const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL || "http://127.0.0.1:5173").replace(/\/+$/, "");
