import { memo, useEffect, useState } from "react";
import "./style.scss";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTERS } from "utils/router";
import {
  challengeAdminMfaAPI,
  confirmAdminMfaAPI,
  loginAdminAPI,
  setupAdminMfaAPI,
} from "api/admin";
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
  const [step, setStep] = useState("credentials");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSetup, setMfaSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [pendingUser, setPendingUser] = useState(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

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
      if (step === "credentials") {
        const response = await loginAdminAPI(form);
        if (response.mfa_enrollment_required) {
          const setup = await setupAdminMfaAPI();
          setMfaSetup(setup);
          setStep("enroll");
          return;
        }
        if (response.mfa_required) {
          setStep("challenge");
          return;
        }
        throw new Error(t("admin.login.error"));
      }

      if (step === "enroll") {
        const response = await confirmAdminMfaAPI(mfaCode);
        setPendingUser(response.user);
        setRecoveryCodes(response.recovery_codes || []);
        setMfaSetup(null);
        setMfaCode("");
        setStep("recovery-codes");
        return;
      }

      const response = await challengeAdminMfaAPI(mfaCode, useRecoveryCode);
      finishLogin(response.user);
    } catch (err) {
      setError(
        err?.response?.data?.message || t("admin.login.error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const finishLogin = (user) => {
    dispatch(setAuthenticatedUser(user));
    navigate(getSafeRedirectPath(redirectPath) || ROUTERS.ADMIN.PRODUCTS, {
      replace: true,
    });
  };

  if (step === "recovery-codes") {
    return (
      <div className="login">
        <div className="login__container">
          <h1 className="login__title">{t("admin.login.recoveryTitle")}</h1>
          <p>{t("admin.login.recoveryDetail")}</p>
          <ul className="login__recovery-codes">
            {recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}
          </ul>
          <button className="login__button" type="button" onClick={() => finishLogin(pendingUser)}>
            {t("admin.login.recoveryContinue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__container">
        <h1 className="login__title">{t("admin.login.title")}</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          {step === "credentials" && <div className="login__form-group">
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
          </div>}
          {step === "credentials" && <div className="login__form-group">
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
          </div>}
          {step === "enroll" && (
            <div className="login__mfa-setup">
              <p>{t("admin.login.mfaSetupDetail")}</p>
              <code className="login__secret">{mfaSetup?.secret}</code>
            </div>
          )}
          {step !== "credentials" && (
            <div className="login__form-group">
              <label htmlFor="mfa-code" className="login__label">
                {useRecoveryCode ? t("admin.login.recoveryCode") : t("admin.login.mfaCode")}
              </label>
              <input
                id="mfa-code"
                value={mfaCode}
                inputMode={useRecoveryCode ? "text" : "numeric"}
                autoComplete="one-time-code"
                onChange={(event) => setMfaCode(event.target.value.trim())}
                required
              />
              {step === "challenge" && (
                <button
                  type="button"
                  className="login__text-button"
                  onClick={() => {
                    setUseRecoveryCode((current) => !current);
                    setMfaCode("");
                  }}
                >
                  {useRecoveryCode ? t("admin.login.useTotp") : t("admin.login.useRecovery")}
                </button>
              )}
            </div>
          )}
          {error && <p className="login__error" role="alert">{error}</p>}
          <button type="submit" className="login__button" disabled={isLoading}>
            {isLoading
              ? t("admin.login.loading")
              : step === "credentials"
              ? t("admin.login.button")
              : t("admin.login.verifyMfa")}
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
