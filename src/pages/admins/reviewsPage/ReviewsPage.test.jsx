import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import ReviewsPage from ".";
import { getAdminReviewsAPI, updateAdminReviewVisibilityAPI } from "api/admin";

vi.mock("api/admin", () => ({
  getAdminReviewsAPI: vi.fn(),
  updateAdminReviewVisibilityAPI: vi.fn(),
}));

const review = {
  id: 9, rating: 5, comment: "Sản phẩm rất tốt", is_visible: true,
  created_at: "2026-09-16T00:00:00Z",
  product: { name: "Cam Tươi" }, user: { name: "Khách hàng", email: "buyer@example.test" },
};

describe("ReviewsPage moderation", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
    getAdminReviewsAPI.mockResolvedValue({ data: [review], meta: { current_page: 1, last_page: 1, total: 1 } });
    updateAdminReviewVisibilityAPI.mockResolvedValue({ ...review, is_visible: false });
  });

  it("requires confirmation before hiding a public review", async () => {
    render(<ReviewsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Ẩn" }));
    await act(async () => {
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }));
    });

    await waitFor(() => expect(updateAdminReviewVisibilityAPI).toHaveBeenCalledWith(9, false));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã cập nhật trạng thái đánh giá.");
  });
});
