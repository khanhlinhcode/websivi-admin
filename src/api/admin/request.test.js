import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "api/axios";
import {
  createAdminBannerAPI,
  challengeAdminMfaAPI,
  confirmAdminMfaAPI,
  getAdminAnalyticsAPI,
  getAdminMediaAPI,
  getAdminProductsAPI,
  getAdminReviewsAPI,
  getAdminSiteSettingsAPI,
  reorderAdminProductImagesAPI,
  reuseAdminCategoryImageAPI,
  reuseAdminProductImageAPI,
  setupAdminMfaAPI,
  updateAdminSiteSettingsAPI,
} from "./request";

vi.mock("api/axios", () => ({
  default: vi.fn(),
}));

describe("getAdminProductsAPI", () => {
  beforeEach(() => {
    axios.mockReset();
  });

  it("requests the selected admin product page instead of a fixed first 50 items", async () => {
    axios.mockResolvedValue({
      data: [],
      meta: { current_page: 3, last_page: 4, total: 75 },
    });

    await getAdminProductsAPI({ page: 3, per_page: 20 });

    expect(axios).toHaveBeenCalledWith({
      url: "/admin/products",
      method: "GET",
      params: {
        page: 3,
        per_page: 20,
      },
    });
  });
});

describe("admin mfa request contracts", () => {
  beforeEach(() => axios.mockReset());

  it("keeps MFA credentials in request bodies only", async () => {
    axios.mockResolvedValue({});

    await setupAdminMfaAPI();
    await confirmAdminMfaAPI("123456");
    await challengeAdminMfaAPI("ABCDE-12345", true);

    expect(axios.mock.calls.map(([config]) => config)).toEqual([
      { url: "/admin/mfa/setup", method: "POST" },
      { url: "/admin/mfa/confirm", method: "POST", data: { code: "123456" } },
      { url: "/admin/mfa/challenge", method: "POST", data: { recovery_code: "ABCDE-12345" } },
    ]);
  });
});

describe("CMS and analytics request contracts", () => {
  beforeEach(() => axios.mockReset());

  it("uses the protected admin endpoints with explicit payloads", async () => {
    axios.mockResolvedValue({});

    await getAdminSiteSettingsAPI();
    await updateAdminSiteSettingsAPI({ brand_name: "Farta" });
    await getAdminReviewsAPI({ visibility: "hidden", page: 2 });
    await getAdminAnalyticsAPI({ range: "90d" });
    await reorderAdminProductImagesAPI(4, [8, 7]);
    await getAdminMediaAPI({ page: 2, kind: "banner" });
    await reuseAdminProductImageAPI(4, { source_type: "banner", source_id: 9 }, true);
    await reuseAdminCategoryImageAPI(3, { source_type: "product_image", source_id: 8 });

    expect(axios.mock.calls.map(([config]) => config)).toEqual([
      { url: "/admin/site-settings", method: "GET" },
      { url: "/admin/site-settings", method: "PUT", data: { brand_name: "Farta" } },
      { url: "/admin/reviews", method: "GET", params: { visibility: "hidden", page: 2 } },
      { url: "/admin/analytics/overview", method: "GET", params: { range: "90d" } },
      { url: "/admin/products/4/images/order", method: "PATCH", data: { image_ids: [8, 7] } },
      { url: "/admin/media", method: "GET", params: { page: 2, kind: "banner", per_page: 24 } },
      { url: "/admin/products/4/images/reuse", method: "POST", data: { media_source_type: "banner", media_source_id: 9, as_primary: true } },
      { url: "/admin/categories/3/image/reuse", method: "POST", data: { media_source_type: "product_image", media_source_id: 8 } },
    ]);
  });

  it("builds multipart banner data without exposing provider fields", async () => {
    axios.mockResolvedValue({});
    const image = new File(["image"], "banner.png", { type: "image/png" });

    await createAdminBannerAPI({ placement: "hero", alt_text_vi: "Hero", image });

    const config = axios.mock.calls[0][0];
    expect(config.url).toBe("/admin/banners");
    expect(config.method).toBe("POST");
    expect([...config.data.keys()]).toEqual(["placement", "alt_text_vi", "image"]);
    expect(config.data.has("image_public_id")).toBe(false);
  });
});
