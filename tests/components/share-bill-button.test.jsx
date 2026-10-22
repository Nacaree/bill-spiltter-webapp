import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ShareBillButton } from "@/components/share-bill-button";

afterEach(cleanup);

it("announces a copied link without moving focus", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<ShareBillButton />);
  const button = screen.getByRole("button", { name: "Copy private link" });
  button.focus();
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Private link copied.",
    ),
  );
  expect(writeText).toHaveBeenCalledWith(window.location.href);
  expect(button).toHaveFocus();
});

it("offers a selected link field when clipboard access is denied", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
    },
  });
  render(<ShareBillButton />);
  fireEvent.click(screen.getByRole("button", { name: "Copy private link" }));
  const field = await screen.findByRole("textbox", {
    name: "Private bill link",
  });
  expect(field).toHaveFocus();
  expect(field).toHaveValue(window.location.href);
  expect(field.selectionEnd - field.selectionStart).toBe(field.value.length);
});
