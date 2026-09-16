import { createSlice } from "@reduxjs/toolkit";
import { hasAdminAccess } from "utils/adminAuth";

const auth = createSlice({
  name: "auth",
  initialState: { adminUser: null, isBootstrapped: false },
  reducers: {
    setAuthenticatedUser(state, { payload }) {
      state.adminUser = hasAdminAccess(payload) ? payload : null;
    },
    setAuthBootstrapped(state) { state.isBootstrapped = true; },
    clearAuth(state) { state.adminUser = null; state.isBootstrapped = true; },
  },
});

export const { setAuthenticatedUser, setAuthBootstrapped, clearAuth } = auth.actions;
export const selectAdminUser = (state) => state.auth.adminUser;
export const selectAuthBootstrapped = (state) => state.auth.isBootstrapped;
export default auth.reducer;
