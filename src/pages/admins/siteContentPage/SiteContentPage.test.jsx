import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import SiteContentPage from ".";
import { getAdminSiteSettingsAPI, updateAdminSiteSettingsAPI } from "api/admin";

vi.mock("api/admin", () => ({
  getAdminSiteSettingsAPI: vi.fn(),
  updateAdminSiteSettingsAPI: vi.fn(),
}));

const settings = {
  brand_name: "FartaMarket", contact_email: "hello@example.test", contact_phone: "0900000000",
  support_phone: "0911111111", address_vi: "Địa chỉ", address_en: "Address",
  featured_title_vi: "Nổi bật", featured_title_en: "Featured",
  recommended_title_vi: "Gợi ý", recommended_title_en: "Recommended",
  free_shipping_threshold: 200000, shipping_fee: 20000,
};

describe("SiteContentPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
    getAdminSiteSettingsAPI.mockResolvedValue(settings);
    updateAdminSiteSettingsAPI.mockImplementation((payload) => Promise.resolve(payload));
  });

  it("loads and saves one typed site-settings form", async () => {
    render(<SiteContentPage />);
    const brand = await screen.findByLabelText("Tên thương hiệu");
    await userEvent.clear(brand);
    await userEvent.type(brand, "Farta Fresh");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(updateAdminSiteSettingsAPI).toHaveBeenCalledWith(
      expect.objectContaining({ brand_name: "Farta Fresh", shipping_fee: 20000 })
    ));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu nội dung website");
  });
});
