import "@testing-library/jest-dom/vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import auth from "../../../../redux/authSlice";
import HeaderAD from ".";

vi.mock("api/admin", () => ({ logoutAdminAPI: vi.fn() }));

const renderHeader = (role = "admin", route = "/san-pham") => {
  const store = configureStore({
    reducer: { auth },
    preloadedState: {
      auth: { adminUser: { id: 1, name: "Local Admin", role }, isBootstrapped: true },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <HeaderAD />
      </MemoryRouter>
    </Provider>
  );
};

describe("Admin grouped navigation", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  it("opens the active group and marks the current route", () => {
    renderHeader("admin", "/san-pham");

    expect(screen.getByRole("button", { name: "Danh mục bán hàng" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Sản phẩm" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the system group only to admins", async () => {
    const admin = renderHeader("admin");
    await userEvent.click(screen.getByRole("button", { name: "Hệ thống" }));
    expect(screen.getByRole("link", { name: "Người dùng" })).toBeVisible();
    admin.unmount();

    renderHeader("staff");
    expect(screen.queryByRole("button", { name: "Hệ thống" })).not.toBeInTheDocument();
  });

  it("opens the mobile drawer and returns focus after Escape", async () => {
    renderHeader();
    const trigger = screen.getByRole("button", { name: "Mở menu quản trị" });

    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Điều hướng quản trị" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Điều hướng quản trị" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("toggles a group by keyboard and closes the drawer after navigation", async () => {
    renderHeader();
    const catalog = screen.getByRole("button", { name: "Danh mục bán hàng" });
    catalog.focus();
    await userEvent.keyboard("{Enter}");
    expect(catalog).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Enter}");
    expect(catalog).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(screen.getByRole("button", { name: "Mở menu quản trị" }));
    await userEvent.click(screen.getByRole("link", { name: "Tất cả ảnh" }));

    expect(screen.queryByRole("dialog", { name: "Điều hướng quản trị" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tất cả ảnh" })).toHaveAttribute("aria-current", "page");
  });
});
