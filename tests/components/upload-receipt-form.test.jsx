import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/direct-image-upload", () => ({
  directImageUpload: mocks.upload,
}));
import { UploadReceiptForm } from "@/components/upload-receipt-form";
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
it("starts on selection, retains the reservation after failure and retries without another selection", async () => {
  const reservation = { uploadId: "same-upload" };
  mocks.upload
    .mockImplementationOnce(async (input) => {
      input.onReservation(reservation);
      throw new Error("Connection interrupted");
    })
    .mockResolvedValueOnce({ receiptScanId: "scan" });
  render(<UploadReceiptForm shareToken="private-link" />);
  const file = new File(["image"], "receipt.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Receipt image"), {
    target: { files: [file] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection interrupted",
  );
  expect(screen.getByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Retry upload" }));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith("/b/private-link/receipts/scan"),
  );
  expect(mocks.upload.mock.calls.map(([input]) => input.file)).toEqual([
    file,
    file,
  ]);
  expect(mocks.upload.mock.calls[1][0].reservation).toBe(reservation);
});
it("does not upload on cancellation or start duplicate work while pending", async () => {
  let finish;
  mocks.upload.mockImplementation(({ onStage }) => {
    onStage("uploading");
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  render(<UploadReceiptForm shareToken="private-link" />);
  const input = screen.getByLabelText("Receipt image");
  fireEvent.change(input, { target: { files: [] } });
  expect(mocks.upload).not.toHaveBeenCalled();
  const file = new File(["image"], "receipt.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(
    await screen.findByRole("button", { name: "Uploading…" }),
  ).toBeDisabled();
  fireEvent.change(input, { target: { files: [file] } });
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  finish({ receiptScanId: "scan" });
  await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
});
it("offers another image after validation failure and clears the previous reservation", async () => {
  mocks.upload
    .mockRejectedValueOnce(new Error("Use a JPEG, PNG, or HEIC image."))
    .mockResolvedValueOnce({ receiptScanId: "valid" });
  render(<UploadReceiptForm shareToken="private-link" />);
  const input = screen.getByLabelText("Receipt image");
  fireEvent.change(input, {
    target: { files: [new File(["bad"], "bad.txt")] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Use a JPEG");
  const click = vi.spyOn(input, "click");
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a different image" }),
  );
  expect(click).toHaveBeenCalledOnce();
  fireEvent.change(input, {
    target: { files: [new File(["ok"], "good.png", { type: "image/png" })] },
  });
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith("/b/private-link/receipts/valid"),
  );
  expect(mocks.upload.mock.calls[1][0].reservation).toBe(null);
});
