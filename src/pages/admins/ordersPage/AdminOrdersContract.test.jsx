import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import AdminOrdersPage from ".";
import { getAdminOrdersAPI } from "api/admin";

vi.mock("api/admin", () => ({
  exportAdminOrdersAPI: vi.fn(),
  getAdminOrdersAPI: vi.fn(),
  updateAdminOrderStatusAPI: vi.fn(),
}));

describe("AdminOrdersPage paginated contract", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
    getAdminOrdersAPI.mockImplementation(({ page }) => Promise.resolve({
      data: [],
      meta: { current_page: page, last_page: 2, total: 24 },
      summary: { orders: 24, pending: 5, delivered_revenue: 1250000 },
    }));
  });

  it("uses backend summary and requests the selected page", async () => {
    render(<AdminOrdersPage />);

    expect(await screen.findByText("Đơn: 24")).toBeInTheDocument();
    expect(screen.getByText("Đơn mới: 5")).toBeInTheDocument();
    expect(screen.getByText("Trang 1/2 · 24 đơn")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    await waitFor(() => expect(getAdminOrdersAPI).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, per_page: 20 })
    ));
  });
});
