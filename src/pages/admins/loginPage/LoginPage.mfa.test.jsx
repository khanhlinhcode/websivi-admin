import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import store from "../../../redux/store";
import { clearAuth } from "../../../redux/authSlice";

const api = vi.hoisted(() => ({
  login: vi.fn(),
  setup: vi.fn(),
  confirm: vi.fn(),
  challenge: vi.fn(),
  me: vi.fn(),
}));
const responseInterceptors = vi.hoisted(() => ({ use: vi.fn(() => 1), eject: vi.fn() }));

vi.mock("api/admin", () => ({
  loginAdminAPI: api.login,
  setupAdminMfaAPI: api.setup,
  confirmAdminMfaAPI: api.confirm,
  challengeAdminMfaAPI: api.challenge,
  getAdminMeAPI: api.me,
}));
vi.mock("api/axios", () => ({
  default: { interceptors: { response: responseInterceptors } },
}));

import AuthBootstrap from "../../../component/AuthBootstrap";
import LoginAdPage from ".";

const renderLogin = ({ bootstrap = false } = {}) => render(
  <Provider store={store}>
    <MemoryRouter initialEntries={["/admin/login"]}>
      {bootstrap && <AuthBootstrap />}
      <LoginAdPage />
    </MemoryRouter>
  </Provider>
);

const reachChallenge = async () => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "strong-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(await screen.findByLabelText("Mã xác thực 6 số")).toBeInTheDocument();
};

describe("Admin MFA login", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    store.dispatch(clearAuth());
    await i18n.changeLanguage("vi");
    api.login.mockResolvedValue({ mfa_required: true });
    api.me.mockRejectedValue({ response: { status: 401 } });
  });

  afterEach(cleanup);

  it("validates and separates authenticator and recovery inputs", async () => {
    api.challenge.mockResolvedValue({ user: { id: 1, role: "admin" } });
    renderLogin();
    await reachChallenge();

    const verify = screen.getByRole("button", { name: "Xác minh" });
    const totp = screen.getByLabelText("Mã xác thực 6 số");
    expect(verify).toBeDisabled();
    fireEvent.change(totp, { target: { value: "12ab3456" } });
    expect(totp).toHaveValue("123456");
    expect(verify).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Dùng mã khôi phục" }));
    const recovery = screen.getByLabelText("Mã khôi phục");
    expect(recovery).toHaveValue("");
    expect(verify).toBeDisabled();
    fireEvent.change(recovery, { target: { value: "abcde-12345" } });
    expect(recovery).toHaveValue("ABCDE-12345");
    fireEvent.click(verify);

    await waitFor(() => expect(api.challenge).toHaveBeenCalledWith("ABCDE-12345", true));
  });

  it("shows distinct invalid TOTP and recovery-code messages", async () => {
    api.challenge.mockRejectedValue({ response: { status: 422 } });
    renderLogin();
    await reachChallenge();

    fireEvent.change(screen.getByLabelText("Mã xác thực 6 số"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mã 6 số không hợp lệ, đã hết hạn hoặc đã được sử dụng."
    );

    fireEvent.click(screen.getByRole("button", { name: "Dùng mã khôi phục" }));
    fireEvent.change(screen.getByLabelText("Mã khôi phục"), { target: { value: "ABCDE-12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mã khôi phục không hợp lệ hoặc đã được sử dụng."
    );
  });

  it("clears the password when returning to the credential step", async () => {
    renderLogin();
    await reachChallenge();

    fireEvent.click(screen.getByRole("button", { name: "Quay lại đăng nhập" }));

    expect(screen.getByLabelText("Email")).toHaveValue("admin@example.test");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("");
    expect(screen.queryByLabelText("Mã xác thực 6 số")).not.toBeInTheDocument();
  });

  it("shows a retry cooldown after too many MFA attempts", async () => {
    api.challenge.mockRejectedValue({ response: { status: 429, headers: { "retry-after": "12" } } });
    renderLogin();
    await reachChallenge();
    fireEvent.change(screen.getByLabelText("Mã xác thực 6 số"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn đã thử quá nhiều lần");
    expect(screen.getByRole("status")).toHaveTextContent("Có thể thử lại sau 12 giây.");
    expect(screen.getByRole("button", { name: "Xác minh" })).toBeDisabled();
  });

  it("keeps the MFA form when admin session bootstrap refreshes on focus", async () => {
    renderLogin({ bootstrap: true });
    await reachChallenge();

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(api.me).toHaveBeenCalledTimes(2));

    expect(screen.getByLabelText("Mã xác thực 6 số")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quay lại đăng nhập" })).toBeInTheDocument();
  });
});
