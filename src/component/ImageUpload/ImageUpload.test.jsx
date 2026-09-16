import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import i18n from "../../i18n";
import ImageUpload from ".";
import {
  reorderAdminProductImagesAPI,
  setAdminProductPrimaryImageAPI,
} from "api/admin";

vi.mock("api/admin", () => ({
  deleteAdminProductImageAPI: vi.fn(),
  reorderAdminProductImagesAPI: vi.fn(),
  setAdminProductPrimaryImageAPI: vi.fn(),
  uploadAdminProductImageAPI: vi.fn(),
  uploadAdminProductImagesAPI: vi.fn(),
}));

const images = [
  { id: 10, url: "https://example.com/one.jpg", is_primary: true },
  { id: 11, url: "https://example.com/two.jpg", is_primary: false },
];

describe("ImageUpload gallery controls", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
  });

  it("sets an existing gallery image as primary", async () => {
    const onUpdated = vi.fn();
    const product = { id: 4, img: images[1].url, images };
    setAdminProductPrimaryImageAPI.mockResolvedValue({ product });

    render(<ImageUpload productId={4} value={images[0].url} images={images} onDeleted={onUpdated} />);
    await userEvent.click(screen.getByRole("button", { name: "Đặt làm ảnh chính" }));

    await waitFor(() => expect(setAdminProductPrimaryImageAPI).toHaveBeenCalledWith(11));
    expect(onUpdated).toHaveBeenCalledWith(product);
  });

  it("sends the complete image order when moving an image", async () => {
    reorderAdminProductImagesAPI.mockResolvedValue({ product: { id: 4, images: [...images].reverse() } });

    render(<ImageUpload productId={4} value={images[0].url} images={images} onDeleted={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Xuống 1" }));

    await waitFor(() =>
      expect(reorderAdminProductImagesAPI).toHaveBeenCalledWith(4, [11, 10])
    );
  });
});
