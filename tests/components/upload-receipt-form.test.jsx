import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/direct-image-upload", () => ({
  directImageUpload: mocks.upload,
}));
import { UploadReceiptForm } from "@/components/upload-receipt-form";
beforeEach(() => vi.clearAllMocks());
it("retains the selected file after failure and retries it without another file selection", async () => {
  mocks.upload
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockResolvedValueOnce({ receiptScanId: "scan" });
  render(<UploadReceiptForm shareToken="private-link" />);
  const file = new File(["image"], "receipt.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Receipt image"), {
    target: { files: [file] },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Upload receipt" }).closest("form"),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection interrupted",
  );
  fireEvent.submit(
    screen.getByRole("button", { name: "Retry upload" }).closest("form"),
  );
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith("/b/private-link/receipts/scan"),
  );
  expect(mocks.upload.mock.calls.map(([input]) => input.file)).toEqual([
    file,
    file,
  ]);
});
