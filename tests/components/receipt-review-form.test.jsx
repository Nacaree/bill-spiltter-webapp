import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { ReceiptReviewForm } from "@/components/receipt-review-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
  confirmReceiptAction: vi.fn(),
  updateReceiptAction: vi.fn(),
  addParticipantAction: vi.fn(),
}));
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
    expect(screen.getByLabelText("Quantity")).toHaveValue("3");
    const row = unitPrice.closest("div");
    const inputs = row.querySelectorAll('input:not([type="hidden"])');
    expect(Array.from(inputs).map((input) => input.name)).toEqual([
      "item-0-description",
      "item-0-quantity",
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

function savedReceipt() {
  return {
    ...scan,
    status: "confirmed",
    adjustment_method: "proportional",
    items: [
      {
        ...scan.items[0],
        id: "00000000-0000-4000-8000-000000000004",
        quantity: 1,
        unit_price_minor: 14975,
        needs_review: false,
        assignments: [
          { participantId: bill.currentParticipantId, amountMinor: 14975 },
        ],
      },
    ],
    expense: {
      id: "00000000-0000-4000-8000-000000000005",
      description: "Corrected meal",
      category: "food",
      expense_date: "2026-08-15",
      paid_by_participant_id: bill.currentParticipantId,
      amount_minor: 12575,
      updated_at: "2026-10-28T00:00:00.000001+00:00",
      notes: "Preserve me",
      shares: [
        { participantId: bill.currentParticipantId, amountMinor: 12575 },
      ],
    },
  };
}

it("restores saved receipt choices and custom positive and negative adjustments", () => {
  const saved = savedReceipt();
  const guest = {
    id: "00000000-0000-4000-8000-000000000006",
    display_name: "Guest",
  };
  saved.adjustment_method = "custom";
  saved.items[0].assignments = [
    { participantId: bill.currentParticipantId, amountMinor: 10000 },
    { participantId: guest.id, amountMinor: 4975 },
  ];
  saved.expense.shares = [
    { participantId: bill.currentParticipantId, amountMinor: 12000 },
    { participantId: guest.id, amountMinor: 575 },
  ];
  render(
    <ReceiptReviewForm
      bill={{ ...bill, participants: [...bill.participants, guest] }}
      scan={saved}
    />,
  );
  expect(screen.getByLabelText("Expense description")).toHaveValue(
    "Corrected meal",
  );
  expect(screen.getByRole("button", { name: /^Date / })).toHaveTextContent(
    "15 Aug 2026",
  );
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent(
    "Food & drinks",
  );
  expect(screen.getByLabelText("Test person adjustment (USD)")).toHaveValue(
    "20.00",
  );
  expect(screen.getByLabelText("Guest adjustment (USD)")).toHaveValue("-44.00");
  const preview = within(
    screen.getByRole("region", { name: "Receipt share preview" }),
  );
  expect(preview.getByRole("row", { name: /Guest/ })).toHaveTextContent(
    "$5.75",
  );
});

it("adds someone without losing edits, keeps them unchecked, and retains a rejected save", async () => {
  const { addParticipantAction, updateReceiptAction } =
    await import("@/app/actions");
  const guest = {
    id: "00000000-0000-4000-8000-000000000006",
    display_name: "Dara",
  };
  addParticipantAction.mockResolvedValue({ success: true, participant: guest });
  updateReceiptAction.mockResolvedValue({
    code: "receipt_conflict",
    errors: {
      form: "Someone changed this receipt. Reload the latest receipt.",
    },
  });
  const saved = savedReceipt();
  const { container } = render(<ReceiptReviewForm bill={bill} scan={saved} />);
  fireEvent.change(screen.getByLabelText("Expense description"), {
    target: { value: "Keep my edit" },
  });
  fireEvent.change(screen.getByLabelText("Add someone"), {
    target: { value: "Dara" },
  });
  const personForm = screen
    .getByRole("button", { name: "Add person" })
    .closest("form");
  const reviewForm = screen
    .getByRole("button", { name: "Save and recalculate" })
    .closest("form");
  expect(personForm).not.toBe(reviewForm);
  expect(container.querySelector("form form")).toBeNull();
  fireEvent.submit(personForm);
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Dara" })).not.toBeChecked(),
  );
  expect(screen.getByLabelText("Expense description")).toHaveValue(
    "Keep my edit",
  );
  expect(
    screen.getByRole("checkbox", { name: "Test person", exact: true }),
  ).toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Dara" }));
  fireEvent.submit(reviewForm);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  expect(screen.getByLabelText("Expense description")).toHaveValue(
    "Keep my edit",
  );
  expect(screen.getByRole("checkbox", { name: "Dara" })).toBeChecked();
  const submitted = updateReceiptAction.mock.calls.at(-1)[1];
  expect(submitted.get("expenseId")).toBe(saved.expense.id);
  expect(submitted.get("expectedUpdatedAt")).toBe(saved.expense.updated_at);
  expect(submitted.has("confirmationKey")).toBe(false);
  expect(submitted.getAll("item-0-participant")).toContain(guest.id);
  expect(
    screen.getByRole("link", { name: "Reload latest receipt" }),
  ).toHaveAttribute("href", `/b/${bill.shareToken}/receipts/${scan.id}?edit=1`);
});

it("requires acknowledgement before replacing a legacy split and labels inactive people", () => {
  const saved = savedReceipt();
  saved.expense.amount_minor = 13000;
  render(
    <ReceiptReviewForm
      bill={{
        ...bill,
        participants: bill.participants.map((person) => ({
          ...person,
          deactivated_at: "2026-01-01",
        })),
      }}
      scan={saved}
    />,
  );
  expect(
    screen.getByRole("checkbox", { name: /Test person.*inactive/ }),
  ).toBeChecked();
  expect(
    screen.getByRole("checkbox", { name: /I confirm replacing/ }),
  ).toBeRequired();
  fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
  const added = within(
    screen.getByRole("group", { name: "Item 2", exact: true }),
  );
  expect(added.getByRole("checkbox", { name: /Test person/ })).toBeDisabled();
  expect(
    added.getByRole("checkbox", { name: /Test person/ }),
  ).not.toBeChecked();
});
