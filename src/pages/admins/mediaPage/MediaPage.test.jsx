import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import { getAdminMediaAPI } from "api/admin";
import AdminMediaPage from ".";

vi.mock("api/admin", () => ({
  getAdminMediaAPI: vi.fn(),
}));

const media = {
  key: "media-key",
  kind: "product",
  label: "Cam tươi",
  url: "https://example.com/orange.jpg",
  usage_count: 2,
};

describe("AdminMediaPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
    getAdminMediaAPI.mockResolvedValue({
      data: [media],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });
  });

  it("loads, labels and filters the shared image library", async () => {
    render(<AdminMediaPage />);

    expect(await screen.findByRole("img", { name: "Cam tươi" })).toBeVisible();
    expect(screen.getByText("Đang dùng ở 2 nơi")).toBeVisible();
    await userEvent.selectOptions(screen.getByLabelText("Nhóm ảnh"), "product");
    await userEvent.type(screen.getByLabelText("Tìm ảnh"), "cam");
    await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));

    await waitFor(() => expect(getAdminMediaAPI).toHaveBeenLastCalledWith({
      page: 1,
      q: "cam",
      kind: "product",
    }));
  });
});
