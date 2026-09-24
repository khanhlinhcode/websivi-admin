import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import i18n from "../../i18n";
import ImageUpload from ".";
import {
  getAdminMediaAPI,
  reorderAdminProductImagesAPI,
  reuseAdminProductImageAPI,
  setAdminProductPrimaryImageAPI,
  uploadAdminProductImagesAPI,
} from "api/admin";

vi.mock("api/admin", () => ({
  deleteAdminProductImageAPI: vi.fn(),
  getAdminMediaAPI: vi.fn(),
  reorderAdminProductImagesAPI: vi.fn(),
  reuseAdminProductImageAPI: vi.fn(),
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
    URL.createObjectURL = vi.fn(() => "blob:local-preview");
    URL.revokeObjectURL = vi.fn();
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

  it("reuses a shared library image as the selected product mode", async () => {
    const media = {
      key: "media-key",
      source_type: "banner",
      source_id: 9,
      kind: "banner",
      label: "Banner rau tươi",
      url: "https://example.com/banner.jpg",
      usage_count: 1,
    };
    const product = { id: 4, img: media.url, images };
    getAdminMediaAPI.mockResolvedValue({ data: [media], meta: { current_page: 1, last_page: 1, total: 1 } });
    reuseAdminProductImageAPI.mockResolvedValue({ product });
    const onUploaded = vi.fn();

    render(<ImageUpload productId={4} value={images[0].url} images={images} onUploaded={onUploaded} onDeleted={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Thay ảnh đại diện"));
    await userEvent.click(screen.getByRole("button", { name: "Chọn từ tất cả ảnh" }));
    await userEvent.click(await screen.findByRole("button", { name: /Banner rau tươi/ }));

    await waitFor(() => expect(reuseAdminProductImageAPI).toHaveBeenCalledWith(4, media, true));
    expect(onUploaded).toHaveBeenCalledWith(product.img, product);
  });

  it("previews a selected file and waits for explicit upload confirmation", async () => {
    const file = new File(["image"], "cam.avif", { type: "image/avif" });
    const product = { id: 4, img: images[0].url, images };
    uploadAdminProductImagesAPI.mockResolvedValue({ product });
    const onUploaded = vi.fn();

    render(<ImageUpload productId={4} value={images[0].url} images={images} onUploaded={onUploaded} onDeleted={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("Chọn ảnh"), file);

    expect(screen.getByRole("img", { name: "cam.avif" })).toBeVisible();
    expect(screen.getByText(/AVIF · 0 MB/)).toBeVisible();
    expect(uploadAdminProductImagesAPI).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tải 1 ảnh" }));
    await waitFor(() => expect(uploadAdminProductImagesAPI).toHaveBeenCalledWith(4, [file]));
    expect(onUploaded).toHaveBeenCalledWith(product.img, product);
  });

  it("rejects unsupported file types before the network request", async () => {
    const file = new File(["<svg></svg>"], "unsafe.svg", { type: "image/svg+xml" });

    render(<ImageUpload productId={4} value={images[0].url} images={images} onUploaded={vi.fn()} onDeleted={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("Chọn ảnh"), file, { applyAccept: false });

    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ chọn ảnh JPG, PNG, WEBP, GIF hoặc AVIF");
    expect(uploadAdminProductImagesAPI).not.toHaveBeenCalled();
  });
});
