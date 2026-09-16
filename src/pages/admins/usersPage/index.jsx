import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  disableAdminUserAPI,
  getAdminUserOrdersAPI,
  getAdminUsersAPI,
  updateAdminUserRoleAPI,
} from "api/admin";
import { AdminState, ConfirmModal } from "component";
import { formatter } from "utils/formatter";
import { isAdmin } from "utils/adminAuth";
import { selectAdminUser } from "../../../redux/authSlice";
import "../admin.scss";

const ROLE_OPTIONS = [
  { value: "", labelKey: "admin.users.allRoles" },
  { value: "admin", labelKey: "admin.users.roleAdmin" },
  { value: "staff", labelKey: "admin.users.roleStaff" },
  { value: "customer", labelKey: "admin.users.roleCustomer" },
];

const getRoleLabelKey = (role) => {
  if (role === "admin") return "admin.users.roleAdmin";
  if (role === "staff") return "admin.users.roleStaff";
  return "admin.users.roleCustomer";
};

const getOrderTotal = (order) => {
  if (order.grand_total !== undefined && order.grand_total !== null) return Number(order.grand_total);
  if (order.total !== undefined && order.total !== null) {
    return Number(order.total);
  }

  return (order.details || []).reduce(
    (sum, detail) => sum + Number(detail.line_total || 0),
    0
  );
};

const AdminUsersPage = () => {
  const { t } = useTranslation();
  const adminUser = useSelector(selectAdminUser);
  const canManage = isAdmin(adminUser);
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userOrders, setUserOrders] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const pendingUser = useMemo(
    () => users.find((user) => user.id === pendingAction?.userId),
    [pendingAction, users]
  );

  const loadUsers = async (page = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getAdminUsersAPI({
        page,
        q: keyword || undefined,
        role: role || undefined,
      });
      setUsers(response.data || []);
      setMeta({
        current_page: response.current_page || 1,
        last_page: response.last_page || 1,
        total: response.total || 0,
      });
    } catch (err) {
      setError(err?.response?.data?.message || t("admin.users.loadError"));
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const loadUserOrders = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    if (userOrders[userId]) {
      return;
    }

    try {
      const response = await getAdminUserOrdersAPI(userId);
      setUserOrders((current) => ({
        ...current,
        [userId]: response.data || [],
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    try {
      if (pendingAction.type === "role") {
        const updatedUser = await updateAdminUserRoleAPI(
          pendingAction.userId,
          pendingAction.role
        );
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === updatedUser.id ? updatedUser : user
          )
        );
        toast.success(t("admin.users.roleUpdated"));
      }

      if (pendingAction.type === "disable") {
        await disableAdminUserAPI(pendingAction.userId);
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === pendingAction.userId
              ? { ...user, deleted_at: new Date().toISOString() }
              : user
          )
        );
        toast.success(t("admin.users.disabled"));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-page__header">
          <div>
            <h1 className="admin-page__title">{t("admin.users.title")}</h1>
            <p className="admin-page__subtitle">{t("admin.users.subtitle")}</p>
          </div>
          <button className="admin-page__button" onClick={() => loadUsers(meta.current_page)}>
            {t("admin.common.refresh")}
          </button>
        </div>

        {error && (
          <div className="admin-page__message admin-page__message--error">
            {error}
          </div>
        )}

        <div className="admin-page__panel">
          <div className="admin-page__toolbar">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("admin.users.searchPlaceholder")}
            />
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
            <button className="admin-page__button" onClick={() => loadUsers(1)}>
              {t("admin.common.search")}
            </button>
          </div>

          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr>
                  <th>{t("admin.common.code")}</th>
                  <th>{t("admin.common.name")}</th>
                  <th>Email</th>
                  <th>{t("admin.users.role")}</th>
                  <th>{t("admin.users.createdAt")}</th>
                  <th>{t("admin.users.orderCount")}</th>
                  <th>{t("admin.users.status")}</th>
                  <th>{t("admin.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="admin-page__badge">
                        {t(getRoleLabelKey(user.role))}
                      </span>
                    </td>
                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("vi-VN")
                        : t("common.noData")}
                    </td>
                    <td>{user.orders_count || 0}</td>
                    <td>
                      {user.deleted_at ? (
                        <span className="admin-page__badge admin-page__badge--danger">
                          {t("admin.users.disabledStatus")}
                        </span>
                      ) : (
                        <span className="admin-page__badge">
                          {t("admin.users.activeStatus")}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-page__actions">
                        <button
                          className="admin-page__button admin-page__button--ghost"
                          onClick={() => loadUserOrders(user.id)}
                        >
                          {t("admin.users.viewOrders")}
                        </button>
                        {canManage &&
                          !user.deleted_at &&
                          ["admin", "staff"].includes(user.role) && (
                            <button
                              className="admin-page__button admin-page__button--ghost"
                              onClick={() =>
                                setPendingAction({
                                  type: "role",
                                  userId: user.id,
                                  role: user.role === "admin" ? "staff" : "admin",
                                })
                              }
                            >
                              {user.role === "admin"
                                ? t("admin.users.makeStaff")
                                : t("admin.users.makeAdmin")}
                            </button>
                        )}
                        {canManage && !user.deleted_at && (
                          <button
                            className="admin-page__button admin-page__button--danger"
                            onClick={() =>
                              setPendingAction({
                                type: "disable",
                                userId: user.id,
                              })
                            }
                          >
                            {t("admin.users.disable")}
                          </button>
                        )}
                      </div>
                      {expandedUserId === user.id && (
                        <div className="admin-page__details">
                          <div className="admin-page__details-list">
                            {(userOrders[user.id] || []).map((order) => (
                              <div key={order.id}>
                                #{order.id} · {formatter(getOrderTotal(order))} ·{" "}
                                {order.status}
                              </div>
                            ))}
                            {userOrders[user.id]?.length === 0 && (
                              <div>{t("admin.users.noOrders")}</div>
                            )}
                            {!userOrders[user.id] && (
                              <div>{t("admin.common.loadingData")}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!users.length && !isLoading && (
                  <tr>
                    <td colSpan={8} className="admin-page__empty">
                      <AdminState message={t("admin.users.empty")} />
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="admin-page__empty">
                      <AdminState type="loading" message={t("admin.common.loadingData")} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.last_page > 1 && (
            <div className="admin-page__pagination">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => loadUsers(meta.current_page - 1)}
              >
                {t("admin.common.previous")}
              </button>
              <span>
                {t("admin.users.pageStatus", {
                  current: meta.current_page,
                  last: meta.last_page,
                  total: meta.total,
                })}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => loadUsers(meta.current_page + 1)}
              >
                {t("admin.common.next")}
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        title={
          pendingAction?.type === "role"
            ? t("admin.users.confirmRoleTitle")
            : t("admin.users.confirmDisableTitle")
        }
        message={
          pendingAction?.type === "role"
            ? t("admin.users.confirmRoleMessage", {
                name: pendingUser?.name || "",
                role:
                  pendingAction?.role === "admin"
                    ? t("admin.users.roleAdmin")
                    : t("admin.users.roleStaff"),
              })
            : t("admin.users.confirmDisableMessage", {
                name: pendingUser?.name || "",
              })
        }
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </main>
  );
};

export default memo(AdminUsersPage);
