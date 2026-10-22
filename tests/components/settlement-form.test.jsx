import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SettlementForm } from "@/components/settlement-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/settlement-actions", () => ({
  createSettlementAction: vi.fn(async () => ({
    errors: {
      toParticipantId: "Sender and recipient must be different people.",
    },
  })),
  updateSettlementAction: vi.fn(),
  removeSettlementAction: vi.fn(),
}));
afterEach(cleanup);

it("links a payment validation error to its selector, retains the entries and focuses it", async () => {
  render(
    <SettlementForm
      settlementId="test-payment"
      bill={{
        currency: "USD",
        shareToken: "private-link",
        currentParticipantId: "owner",
        participants: [
          { id: "owner", display_name: "Owner" },
          { id: "guest", display_name: "Guest" },
        ],
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Received by"), {
    target: { value: "owner" },
  });
  fireEvent.change(screen.getByLabelText("Payment amount (USD)"), {
    target: { value: "4.00" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Record payment" }).closest("form"),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: /^Received by/ }),
    ).toHaveFocus(),
  );
  const receiver = screen.getByRole("combobox", { name: /^Received by/ });
  expect(receiver).toHaveAttribute("aria-invalid", "true");
  expect(receiver).toHaveAccessibleDescription(
    "Sender and recipient must be different people.",
  );
  expect(receiver).toHaveValue("owner");
  expect(screen.getByLabelText("Payment amount (USD)")).toHaveValue("4.00");
});
