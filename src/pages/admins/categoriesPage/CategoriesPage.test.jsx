import "@testing-library/jest-dom/vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import auth from "../../../redux/authSlice";
import { getAdminCategoriesAPI, uploadAdminCategoryImageAPI } from "api/admin";
import AdminCategoriesPage from ".";

vi.mock("api/admin", () => ({
  createAdminCategoryAPI: vi.fn(),
  deleteAdminCategoryAPI: vi.fn(),
  deleteAdminCategoryImageAPI: vi.fn(),
  getAdminCategoriesAPI: vi.fn(),
  getAdminMediaAPI: vi.fn(),
  reuseAdminCategoryImageAPI: vi.fn(),
  updateAdminCategoryAPI: vi.fn(),
  uploadAdminCategoryImageAPI: vi.fn(),
}));

const renderPage = () => {
  const store = configureStore({
    reducer: { auth },
    preloadedState: {
      auth: { adminUser: { id: 1, role: "admin" }, isBootstrapped: true },
    },
  });

  return render(<Provider store={store}><AdminCategoriesPage /></Provider>);
};

describe("AdminCategoriesPage image selection", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
    getAdminCategoriesAPI.mockResolvedValue([]);
    URL.createObjectURL = vi.fn(() => "blob:category-preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows a local preview without uploading before form submission", async () => {
    const file = new File(["image"], "rau.webp", { type: "image/webp" });
    renderPage();
    await waitFor(() => expect(getAdminCategoriesAPI).toHaveBeenCalled());

    await userEvent.upload(screen.getByLabelText("Ảnh danh mục"), file);

    expect(screen.getByRole("img", { name: "rau.webp" })).toHaveAttribute("src", "blob:category-preview");
    expect(screen.getByText(/WEBP · 0 MB/)).toBeVisible();
    expect(uploadAdminCategoryImageAPI).not.toHaveBeenCalled();
  });
});
