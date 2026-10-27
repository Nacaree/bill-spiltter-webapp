import { DeleteBillForm } from "@/components/delete-bill-form";
import Link from "next/link";
import { reportAppError } from "@/server/monitoring";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AddParticipantForm } from "@/components/add-participant-form";
import { BalancesSection } from "@/components/balances-section";
import { ClaimParticipantForm } from "@/components/claim-participant-form";
import { ExpenseEditor } from "@/components/expense-editor";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseHistoryFilters } from "@/components/expense-history-filters";
import { JoinBillForm } from "@/components/join-bill-form";
import { RemoveExpenseForm } from "@/components/remove-expense-form";
import { ShareBillButton } from "@/components/share-bill-button";
import { UploadReceiptForm } from "@/components/upload-receipt-form";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";
import { formatMoney } from "@/lib/money";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
} from "@/lib/participant-session";
import {
  BillNotFoundError,
  getBillByShareToken,
  getSessionParticipant,
} from "@/server/bills";
import { getBillActivity, getExpenses } from "@/server/expenses";
import { getRecentReceiptScans } from "@/server/receipts";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function generateMetadata({ params }) {
  const { shareToken } = await params;
  try {
    const bill = await getBillByShareToken(shareToken);
    return { title: bill.name };
  } catch (error) {
    if (error instanceof BillNotFoundError) return { title: "Bill not found" };
    throw error;
  }
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function activityDescription(activity, participantNames) {
  const actor =
    participantNames.get(activity.actor_participant_id) ?? "Someone";
  if (activity.action.startsWith("settlement.")) {
    const verbs = {
      "settlement.created": "recorded",
      "settlement.updated": "corrected",
      "settlement.removed": "removed",
    };
    const from =
      participantNames.get(activity.metadata?.from_participant_id) ??
      "a participant";
    const to =
      participantNames.get(activity.metadata?.to_participant_id) ??
      "a participant";
    return `${actor} ${verbs[activity.action] ?? "changed"} a payment from ${from} to ${to}`;
  }
  if (activity.action.startsWith("payment_method.")) {
    return `${actor} ${activity.action.endsWith("removed") ? "removed" : "updated"} the owner’s payment QR`;
  }
  const description = activity.metadata?.description ?? "an expense";
  const verbs = {
    "expense.created": "added",
    "expense.removed": "removed",
    "expense.updated": "updated",
  };
  return `${actor} ${verbs[activity.action] ?? "changed"} ${description}`;
}

export default async function BillPage({ params, searchParams }) {
  const { shareToken } = await params;
  const requestedFilters = await searchParams;
  let bill;
  try {
    bill = await getBillByShareToken(shareToken);
  } catch (error) {
    if (error instanceof BillNotFoundError) notFound();
    throw error;
  }

  const cookieStore = await cookies();
  const participant = await getSessionParticipant(
    bill.id,
    cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
  );
  const claimableParticipants = bill.participants.filter(
    (person) => person.canClaim,
  );
  const category = EXPENSE_CATEGORIES.includes(requestedFilters.category)
    ? requestedFilters.category
    : undefined;
  const participantId = bill.participants.some(
    (person) => person.id === requestedFilters.participant,
  )
    ? requestedFilters.participant
    : undefined;

  let expenses = [];
  let activity = [];
  let receiptScans = [];
  let ledgerError = false;
  try {
    [expenses, activity] = await Promise.all([
      getExpenses(bill.id, { category, participantId }),
      getBillActivity(bill.id),
    ]);
  } catch (error) {
    reportAppError(error, "ledger_load");
    ledgerError = true;
  }
  let receiptError = false;
  try {
    receiptScans = await getRecentReceiptScans(bill.id);
  } catch (error) {
    reportAppError(error, "receipts_load");
    receiptError = true;
  }

  const participantNames = new Map(
    bill.participants.map((person) => [person.id, person.display_name]),
  );
  const formBill = {
    currency: bill.currency,
    currentParticipantId: participant?.id,
    participants: bill.participants.map(({ display_name, id }) => ({
      display_name,
      id,
    })),
    shareToken,
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-brand text-sm font-bold tracking-widest uppercase">
            Shared bill
          </p>
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight">
            {bill.name}
          </h1>
          <p className="text-muted mt-2">Currency: {bill.currency}</p>
          {bill.expires_at ? (
            <p className="text-muted mt-2 text-sm">
              Expires{" "}
              <time dateTime={bill.expires_at}>
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(bill.expires_at))}{" "}
                (UTC)
              </time>{" "}
              after 12 months without changes.
            </p>
          ) : null}
          {bill.expiresSoon ? (
            <p
              role="status"
              className="rounded-control mt-3 bg-amber-50 p-4 text-sm text-amber-950"
            >
              This bill expires within 30 days and will become eligible for
              permanent deletion. A successful bill change extends its life by
              12 months; viewing it does not.
            </p>
          ) : null}
        </div>
        <ShareBillButton />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className="app-panel">
          <h2 className="text-foreground text-xl font-bold">People</h2>
          <ul className="divide-line mt-5 divide-y">
            {bill.participants.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-4 py-[var(--ds-row-padding)] first:pt-0 last:pb-0"
              >
                <span className="text-foreground font-medium">
                  {person.display_name}
                </span>
                {person.is_creator ? (
                  <span className="bg-tint text-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                    Creator
                  </span>
                ) : person.canClaim ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Waiting to join
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <aside className="app-panel">
          {participant ? (
            <>
              <p className="text-muted text-sm">You’re joining as</p>
              <p className="text-foreground mt-1 text-lg font-bold">
                {participant.display_name}
              </p>
              <p className="text-muted mt-4 text-sm leading-6">
                This device can add, edit, and remove bill expenses.
              </p>
              <AddParticipantForm shareToken={shareToken} />
            </>
          ) : (
            <>
              <h2 className="text-foreground text-xl font-bold">
                Join this bill
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Joining remembers you on this device and lets you make changes.
              </p>
              {claimableParticipants.length ? (
                <div className="rounded-control bg-tint mt-5 p-4">
                  <h3 className="text-foreground font-semibold">
                    Already listed?
                  </h3>
                  <ClaimParticipantForm
                    participants={claimableParticipants}
                    shareToken={shareToken}
                  />
                </div>
              ) : null}
              {claimableParticipants.length ? (
                <p className="text-foreground mt-5 text-sm font-semibold">
                  Not listed? Add yourself instead.
                </p>
              ) : null}
              <JoinBillForm shareToken={shareToken} />
            </>
          )}
        </aside>
      </div>

      <BalancesSection
        bill={bill}
        participant={participant}
        shareToken={shareToken}
      />

      <section className="app-panel mt-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-brand text-sm font-bold tracking-widest uppercase">
              Receipt upload
            </p>
            <h2 className="text-foreground mt-2 text-2xl font-bold">
              Import a receipt
            </h2>
            <p className="text-muted mt-2 mb-6 text-sm leading-6">
              Upload an image, review every extracted item, then confirm it.
              Drafts never affect balances.
            </p>
            {participant ? (
              <UploadReceiptForm shareToken={shareToken} />
            ) : (
              <div className="rounded-control bg-amber-50 p-5 text-sm text-amber-950">
                Join this bill first to upload a receipt.
              </div>
            )}
          </div>
          <div>
            <h3 className="text-foreground text-lg font-bold">
              Recent uploads
            </h3>
            <p className="text-muted mt-3 text-sm leading-6">
              Unconfirmed receipts expire after 24 hours. Confirmed receipt
              images stay until the bill is deleted.
            </p>
            {receiptError ? (
              <p role="alert" className="mt-4 text-sm text-red-700">
                We couldn’t load recent receipt uploads.
              </p>
            ) : receiptScans.length ? (
              <ul className="divide-line mt-4 divide-y">
                {receiptScans.map((scan) => (
                  <li
                    key={scan.id}
                    className="py-[var(--ds-row-padding)] first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/b/${shareToken}/receipts/${scan.id}`}
                      className="focus-visible:outline-brand flex items-center justify-between gap-3 rounded-lg focus-visible:outline-2"
                    >
                      <span className="min-w-0">
                        <span className="text-foreground block truncate text-sm font-semibold">
                          {scan.merchant_name || scan.original_filename}
                        </span>
                        <span className="text-muted mt-0.5 block text-xs">
                          {new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                          }).format(new Date(scan.created_at))}
                        </span>
                      </span>
                      <span className="bg-tint text-foreground rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                        {scan.status.replace("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-control border-line text-muted mt-4 border border-dashed p-6 text-center text-sm">
                No receipt uploads yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="app-panel mt-8">
        <div>
          <p className="text-brand text-sm font-bold tracking-widest uppercase">
            Expense ledger
          </p>
          <h2 className="text-foreground mt-2 text-2xl font-bold">
            Add an expense
          </h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Split the total equally or enter each person’s exact amount.
          </p>
        </div>
        <div className="mt-6">
          {participant ? (
            <ExpenseForm bill={formBill} />
          ) : (
            <div className="rounded-control bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              Join this bill first to add or change expenses.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground text-2xl font-bold">
              Expense history
            </h2>
            <p className="text-muted mt-1 text-sm">
              Newest expenses appear first.
            </p>
          </div>
          <ExpenseHistoryFilters
            category={category ?? ""}
            participantId={participantId ?? ""}
            participants={formBill.participants}
            shareToken={shareToken}
          />
        </div>

        {ledgerError ? (
          <div
            role="alert"
            className="rounded-control mt-6 border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900"
          >
            We couldn’t load the expenses. Refresh the page and try again.
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-control border-line mt-6 border border-dashed bg-white p-8 text-center">
            <h3 className="text-foreground font-bold">
              {category || participantId
                ? "No expenses match these filters"
                : "No expenses yet"}
            </h3>
            <p className="text-muted mt-2 text-sm">
              {category || participantId
                ? "Clear the filters or try a different selection."
                : "Add the first expense above to start the ledger."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {expenses.map((expense) => (
              <article
                key={expense.id}
                className="rounded-card border-line border bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id={`expense-${expense.id}-heading`}
                        className="text-foreground text-lg font-bold"
                      >
                        {expense.description}
                      </h3>
                      <span className="bg-tint text-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </span>
                    </div>
                    <p className="text-muted mt-2 text-sm">
                      {displayDate(expense.expense_date)} · Paid by{" "}
                      {participantNames.get(expense.paid_by_participant_id)} ·{" "}
                      {expense.split_method === "equal"
                        ? "Equal split"
                        : "Exact split"}
                    </p>
                  </div>
                  <p className="text-foreground text-xl font-bold">
                    {formatMoney(expense.amount_minor, bill.currency)}
                  </p>
                </div>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {expense.shares.map((share) => (
                    <li
                      key={share.participantId}
                      className="rounded-control bg-canvas flex justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">
                        {participantNames.get(share.participantId)}
                      </span>
                      <span className="text-foreground font-semibold">
                        {formatMoney(share.amountMinor, bill.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                {expense.receipt_scan_id ? (
                  <Link
                    href={`/b/${shareToken}/receipts/${expense.receipt_scan_id}`}
                    aria-describedby={`expense-${expense.id}-heading`}
                    className="text-brand mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                  >
                    View receipt
                  </Link>
                ) : null}
                {expense.notes ? (
                  <p className="text-muted mt-4 text-sm leading-6 whitespace-pre-wrap">
                    {expense.notes}
                  </p>
                ) : null}

                {participant ? (
                  <div className="border-line mt-5 grid gap-4 border-t pt-4">
                    <ExpenseEditor bill={formBill} expense={expense} />
                    <RemoveExpenseForm
                      expenseId={expense.id}
                      shareToken={shareToken}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {!ledgerError && activity.length ? (
        <section className="app-panel mt-8">
          <h2 className="text-foreground text-xl font-bold">Recent changes</h2>
          <ul className="divide-line mt-4 divide-y">
            {activity.map((item) => (
              <li key={item.id} className="py-3 text-sm first:pt-0 last:pb-0">
                <p className="text-foreground font-medium">
                  {activityDescription(item, participantNames)}
                </p>
                <time className="text-muted mt-1 block text-xs">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {participant?.is_creator &&
      cookieStore.get(CREATOR_COOKIE_NAME)?.value ? (
        <DeleteBillForm shareToken={shareToken} />
      ) : null}
    </div>
  );
}
