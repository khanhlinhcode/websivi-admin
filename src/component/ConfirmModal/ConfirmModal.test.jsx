import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import ConfirmModal from ".";

describe("ConfirmModal", () => {
  it("renders content and calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen
        title="Xóa sản phẩm"
        message="Bạn có chắc chắn muốn xoá không?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Xóa sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Bạn có chắc chắn muốn xoá không?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
