import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import AnalyticsPage from ".";
import { getAdminAnalyticsAPI } from "api/admin";

vi.mock("api/admin", () => ({ getAdminAnalyticsAPI: vi.fn() }));

const report = {
  totals: { page_views: 12, sessions: 7, visitors: 5, tracked_orders: 2, conversion_rate: 28.57 },
  by_day: [{ date: "2026-09-16", page_views: 12, sessions: 7, visitors: 5 }],
  devices: [{ label: "mobile", total: 8 }],
  browsers: [], operating_systems: [], top_pages: [], referrers: [],
};

describe("AnalyticsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    getAdminAnalyticsAPI.mockReset();
  });

  it("renders aggregated data and reloads the selected range", async () => {
    getAdminAnalyticsAPI.mockResolvedValue(report);
    render(<AnalyticsPage />);

    expect((await screen.findAllByText("12")).length).toBeGreaterThan(0);
    expect(screen.getByText("28.57%")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Phân tích truy cập" }), "90d");
    await waitFor(() => expect(getAdminAnalyticsAPI).toHaveBeenLastCalledWith({ range: "90d" }));
  });

  it("offers a retry after a load error", async () => {
    getAdminAnalyticsAPI.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(report);
    render(<AnalyticsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(getAdminAnalyticsAPI).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("12")).length).toBeGreaterThan(0);
  });
});
