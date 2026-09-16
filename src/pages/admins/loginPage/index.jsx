import { memo, useEffect, useState } from "react";
import "./style.scss";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTERS } from "utils/router";
import { loginAdminAPI } from "api/admin";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAdminSession,
  hasAdminAccess,
} from "utils/adminAuth";
import {
  selectAdminUser,
  setAuthenticatedUser,
} from "../../../redux/authSlice";

const LoginAdPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminUser = useSelector(selectAdminUser);
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearAdminSession();

    if (hasAdminAccess(adminUser)) {
      navigate(getSafeRedirectPath(redirectPath) || ROUTERS.ADMIN.PRODUCTS, {
        replace: true,
      });
    }
  }, [adminUser, navigate, redirectPath]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await loginAdminAPI(form);
      dispatch(setAuthenticatedUser(response.user));
      navigate(getSafeRedirectPath(redirectPath) || ROUTERS.ADMIN.PRODUCTS, {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || t("admin.login.error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__container">
        <h1 className="login__title">{t("admin.login.title")}</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-group">
            <label htmlFor="email" className="login__label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="login__form-group">
            <label htmlFor="password" className="login__label">
              {t("admin.login.password")}
            </label>
            <div className="login__password-field">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="login__password-toggle"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </div>
          </div>
          {error && <p className="login__error" role="alert">{error}</p>}
          <button type="submit" className="login__button" disabled={isLoading}>
            {isLoading ? t("admin.login.loading") : t("admin.login.button")}
          </button>
        </form>
      </div>
    </div>
  );
};
export default memo(LoginAdPage);

const getSafeRedirectPath = (path) => {
  if (!Object.values(ROUTERS.ADMIN).includes(path) || path === ROUTERS.ADMIN.LOGIN) {
    return "";
  }

  return path;
};
