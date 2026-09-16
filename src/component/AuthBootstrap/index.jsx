import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAdminMeAPI } from "api/admin";
import axios from "api/axios";
import { clearAdminSession } from "utils/adminAuth";
import { clearAuth, setAuthenticatedUser, setAuthBootstrapped } from "../../redux/authSlice";

export default function AuthBootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    let requestId = 0;
    clearAdminSession();
    const refresh = async () => {
      const id = ++requestId;
      try {
        const user = await getAdminMeAPI();
        if (id === requestId) dispatch(setAuthenticatedUser(user.user || user));
      } catch {
        if (id === requestId) dispatch(clearAuth());
      } finally {
        if (id === requestId) dispatch(setAuthBootstrapped());
      }
    };
    const interceptor = axios.interceptors.response.use(undefined, (error) => {
      if (error.response?.status === 401 && error.config?.url !== "/admin/login") {
        dispatch(clearAuth());
      }
      return Promise.reject(error);
    });
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      requestId++;
      window.removeEventListener("focus", refresh);
      axios.interceptors.response.eject(interceptor);
    };
  }, [dispatch]);
  return null;
}
