import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ReceiptReviewForm } from "@/components/receipt-review-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/actions", () => ({ confirmReceiptAction: vi.fn() }));
afterEach(cleanup);

const bill = {
  currency: "USD",
  shareToken: "a".repeat(43),
  currentParticipantId: "00000000-0000-4000-8000-000000000001",
  participants: [
    { id: "00000000-0000-4000-8000-000000000001", display_name: "Test person" },
  ],
};
const scan = {
  id: "00000000-0000-4000-8000-000000000002",
  merchant_name: "Test receipt",
  receipt_date: "2026-08-16",
  subtotal_minor: 14975,
  tax_minor: 0,
  tip_minor: 0,
  discount_minor: 2400,
  total_minor: 12575,
  items: [
    {
      id: "test-item",
      description: "Items",
      total_minor: 14975,
      needs_review: true,
    },
  ],
};
function show(overrides = {}) {
  render(
    <ReceiptReviewForm
      bill={bill}
      scan={{ ...scan, ...overrides }}
      confirmationKey="00000000-0000-4000-8000-000000000003"
    />,
  );
  return within(screen.getByRole("group", { name: "Receipt totals" }));
}

describe("Receipt review totals", () => {
  it("shows unit price between description and line total and updates by scanned quantity", () => {
    show({
      items: [
        {
          ...scan.items[0],
          quantity: 3,
          unit_price_minor: 350,
          total_minor: 1050,
        },
      ],
    });
    const unitPrice = screen.getByLabelText(/^Unit price \(USD\)/);
    expect(unitPrice).toHaveValue("3.50");
    expect(screen.getByText("Quantity: 3")).toBeInTheDocument();
    const row = unitPrice.closest("div");
    const inputs = row.querySelectorAll('input:not([type="hidden"])');
    expect(Array.from(inputs).map((input) => input.name)).toEqual([
      "item-0-description",
      "item-0-unit-price",
      "item-0-total",
    ]);
    fireEvent.change(unitPrice, { target: { value: "4.25" } });
    expect(screen.getByLabelText("Line total (USD)")).toHaveValue("12.75");
    const formData = new FormData(unitPrice.closest("form"));
    expect(formData.get("item-0-unit-price")).toBe("4.25");
    expect(formData.get("item-0-quantity")).toBe("3");
  });

  it("keeps unreadable prices blank and updates new items as quantity one", () => {
    show();
    expect(screen.getByLabelText(/^Unit price \(USD\)/)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    const unitPrices = screen.getAllByLabelText(/^Unit price \(USD\)/);
    fireEvent.change(unitPrices[1], { target: { value: "2.50" } });
    expect(screen.getAllByLabelText("Line total (USD)")[1]).toHaveValue("2.50");
  });

  it("explains the supplied receipt's discount without an unexplained mismatch", () => {
    const totals = show();
    expect(totals.getByRole("status")).toHaveTextContent(
      "Items and adjustments match the printed total.",
    );
    expect(totals.getByText(/\$149\.75 items/)).toHaveTextContent(
      "$149.75 items − $24.00 discount = $125.75",
    );
    expect(totals.queryByText(/differ/)).not.toBeInTheDocument();
  });

  it("recalculates when the user edits a discount and the printed total", () => {
    const totals = show();
    fireEvent.change(totals.getByLabelText("Discount"), {
      target: { value: "20.00" },
    });
    expect(totals.getByRole("status")).toHaveTextContent("$4.00");
    expect(totals.getByRole("status")).toHaveTextContent(
      "After tax, tip, and discount",
    );
    fireEvent.change(totals.getByLabelText("Printed total"), {
      target: { value: "129.75" },
    });
    expect(totals.getByRole("status")).toHaveTextContent(
      "match the printed total",
    );
    const form = screen
      .getByRole("button", { name: "Confirm and add expense" })
      .closest("form");
    expect(new FormData(form).get("discount")).toBe("20.00");
  });

  it("includes tax and tip in reconciliation and responds to tax edits", () => {
    const totals = show({ tax_minor: 800, tip_minor: 200, total_minor: 13575 });
    expect(totals.getByRole("status")).toHaveTextContent(
      "match the printed total",
    );
    fireEvent.change(totals.getByLabelText("Tax"), {
      target: { value: "4.00" },
    });
    expect(totals.getByRole("status")).toHaveTextContent("$4.00");
  });

  it("identifies a subtotal discrepancy even when the item net matches the printed total", () => {
    const totals = show({ subtotal_minor: 15000 });
    expect(totals.getByRole("status")).toHaveTextContent(
      "Item amounts differ from the subtotal by $0.25",
    );
    expect(
      totals.queryByText("Items and adjustments match the printed total."),
    ).not.toBeInTheDocument();
    fireEvent.change(totals.getByLabelText("Subtotal"), {
      target: { value: "149.75" },
    });
    expect(totals.getByRole("status")).toHaveTextContent(
      "match the printed total",
    );
  });

  it("does not claim a match when the printed total is missing", () => {
    const totals = show({ total_minor: null });
    expect(totals.getByRole("status")).toHaveTextContent(
      "Enter valid item amounts",
    );
  });

  it("does not silently skip an invalid item or an invalid adjustment", () => {
    const totals = show();
    fireEvent.change(screen.getByLabelText("Line total (USD)"), {
      target: { value: "" },
    });
    expect(totals.getByRole("status")).toHaveTextContent(
      "Enter valid item amounts",
    );
    fireEvent.change(screen.getByLabelText("Line total (USD)"), {
      target: { value: "149.75" },
    });
    fireEvent.change(totals.getByLabelText("Discount"), {
      target: { value: "-24.00" },
    });
    expect(totals.getByRole("status")).toHaveTextContent(
      "Enter valid item amounts",
    );
  });
});

it("keeps keyboard focus on receipt items when adding or removing rows", () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
  const second = screen.getByRole("group", { name: "Item 2", exact: true });
  expect(within(second).getByLabelText("Description")).toHaveFocus();
  fireEvent.click(
    within(second).getByRole("button", { name: "Remove item 2" }),
  );
  const first = screen.getByRole("group", { name: "Item 1", exact: true });
  expect(within(first).getByLabelText("Description")).toHaveFocus();
  fireEvent.click(within(first).getByRole("button", { name: "Remove item 1" }));
  expect(screen.getByRole("button", { name: "+ Add item" })).toHaveFocus();
});
