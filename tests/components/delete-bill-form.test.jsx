import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeleteBillForm } from "@/components/delete-bill-form";
import { ReceiptImage } from "@/components/receipt-image";
const mocks = vi.hoisted(() => ({ deleteBill: vi.fn() }));
vi.mock("@/app/lifecycle-actions", () => ({
  deleteBillAction: mocks.deleteBill,
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("announces and focuses a rejected confirmation while retaining its text", async () => {
  mocks.deleteBill.mockResolvedValue({
    errors: { confirmation: "Type DELETE to confirm permanent deletion." },
  });
  render(<DeleteBillForm shareToken="private" />);
  const input = screen.getByLabelText("Type DELETE to confirm");
  fireEvent.change(input, { target: { value: "delete" } });
  fireEvent.submit(input.closest("form"));
  await waitFor(() => expect(input).toHaveFocus());
  expect(input).toHaveValue("delete");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(
    "Type DELETE to confirm permanent deletion.",
  );
});
it("blocks duplicate submissions while pending and keeps action errors inside the form", async () => {
  let finish;
  mocks.deleteBill.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<DeleteBillForm shareToken="private" />);
  const input = screen.getByLabelText("Type DELETE to confirm");
  fireEvent.change(input, { target: { value: "DELETE" } });
  fireEvent.submit(input.closest("form"));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Deleting bill…" }),
    ).toBeDisabled(),
  );
  finish({ errors: { form: "Use the device that created this bill." } });
  await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  expect(input.closest("form")).toContainElement(screen.getByRole("alert"));
});
it("shows a readable fallback for a missing or failed receipt image", () => {
  const { rerender } = render(<ReceiptImage src={null} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Receipt image unavailable.",
  );
  rerender(<ReceiptImage src="private-url" />);
  fireEvent.error(screen.getByAltText("Uploaded receipt"));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Receipt image unavailable.",
  );
  rerender(<ReceiptImage src="fresh-url" />);
  expect(screen.getByAltText("Uploaded receipt")).toBeVisible();
});
