import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import AdminProductsPage from ".";
import {
  getAdminCategoriesAPI,
  getAdminProductsAPI,
} from "api/admin";

vi.mock("api/admin", () => ({
  createAdminProductAPI: vi.fn(),
  deleteAdminProductAPI: vi.fn(),
  getAdminCategoriesAPI: vi.fn(),
  getAdminProductsAPI: vi.fn(),
  updateAdminProductAPI: vi.fn(),
  uploadAdminProductImageAPI: vi.fn(),
}));

vi.mock("utils/adminAuth", () => ({
  isAdmin: () => true,
}));

describe("AdminProductsPage pagination", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    getAdminProductsAPI.mockReset();
    getAdminCategoriesAPI.mockReset();
    getAdminCategoriesAPI.mockResolvedValue([]);
    getAdminProductsAPI.mockImplementation(({ page }) =>
      Promise.resolve({
        data: [],
        meta: {
          current_page: page,
          last_page: 2,
          total: 21,
        },
      })
    );
  });

  it("loads the next page from the backend", async () => {
    const store = configureStore({
      reducer: {
        auth: () => ({
          adminUser: { role: "admin" },
          isBootstrapped: true,
          user: null,
        }),
      },
    });

    render(
      <Provider store={store}>
        <AdminProductsPage />
      </Provider>
    );

    expect(
      await screen.findByText("Trang 1/2 · 21 sản phẩm")
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Trang sau" })
    );

    await waitFor(() =>
      expect(getAdminProductsAPI).toHaveBeenLastCalledWith({
        page: 2,
        per_page: 20,
      })
    );
    expect(
      await screen.findByText("Trang 2/2 · 21 sản phẩm")
    ).toBeInTheDocument();
  });
});
