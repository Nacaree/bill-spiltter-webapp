import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AddParticipantForm } from "@/components/add-participant-form";
import { BalancesSection } from "@/components/balances-section";
import { ClaimParticipantForm } from "@/components/claim-participant-form";
import { ExpenseEditor } from "@/components/expense-editor";
import { ExpenseForm } from "@/components/expense-form";
import { JoinBillForm } from "@/components/join-bill-form";
import { RemoveExpenseForm } from "@/components/remove-expense-form";
import { ShareBillButton } from "@/components/share-bill-button";
import { UploadReceiptForm } from "@/components/upload-receipt-form";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";
import { formatMoney } from "@/lib/money";
import { PARTICIPANT_COOKIE_NAME } from "@/lib/participant-session";
import {
  BillNotFoundError,
  getBillByShareToken,
  getSessionParticipant,
} from "@/server/bills";
import { getBillActivity, getExpenses } from "@/server/expenses";
import { getRecentReceiptScans } from "@/server/receipts";

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
    console.error("Unable to load expense ledger:", error.message);
    ledgerError = true;
  }
  let receiptError = false;
  try {
    receiptScans = await getRecentReceiptScans(bill.id);
  } catch (error) {
    console.error("Unable to load receipt uploads:", error.message);
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
          <p className="text-sm font-bold tracking-widest text-teal-700 uppercase">
            Shared bill
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            {bill.name}
          </h1>
          <p className="mt-2 text-slate-600">Currency: {bill.currency}</p>
        </div>
        <ShareBillButton />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">People</h2>
          <ul className="mt-5 divide-y divide-slate-100">
            {bill.participants.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium text-slate-800">
                  {person.display_name}
                </span>
                {person.is_creator ? (
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
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

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {participant ? (
            <>
              <p className="text-sm text-slate-500">You’re joining as</p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {participant.display_name}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                This device can add, edit, and remove bill expenses.
              </p>
              <AddParticipantForm shareToken={shareToken} />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-950">
                Join this bill
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Joining remembers you on this device and lets you make changes.
              </p>
              {claimableParticipants.length ? (
                <div className="mt-5 rounded-2xl bg-teal-50 p-4">
                  <h3 className="font-semibold text-slate-950">
                    Already listed?
                  </h3>
                  <ClaimParticipantForm
                    participants={claimableParticipants}
                    shareToken={shareToken}
                  />
                </div>
              ) : null}
              {claimableParticipants.length ? (
                <p className="mt-5 text-sm font-semibold text-slate-700">
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

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-widest text-teal-700 uppercase">
              Receipt upload
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Import a receipt
            </h2>
            <p className="mt-2 mb-6 text-sm leading-6 text-slate-600">
              Upload an image, review every extracted item, then confirm it.
              Drafts never affect balances.
            </p>
            {participant ? (
              <UploadReceiptForm shareToken={shareToken} />
            ) : (
              <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-950">
                Join this bill first to upload a receipt.
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Recent uploads</h3>
            {receiptError ? (
              <p role="alert" className="mt-4 text-sm text-red-700">
                We couldn’t load recent receipt uploads.
              </p>
            ) : receiptScans.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {receiptScans.map((scan) => (
                  <li key={scan.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/b/${shareToken}/receipts/${scan.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-teal-700"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {scan.merchant_name || scan.original_filename}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                          }).format(new Date(scan.created_at))}
                        </span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize">
                        {scan.status.replace("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                No receipt uploads yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-bold tracking-widest text-teal-700 uppercase">
            Expense ledger
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Add an expense
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Split the total equally or enter each person’s exact amount.
          </p>
        </div>
        <div className="mt-6">
          {participant ? (
            <ExpenseForm bill={formBill} />
          ) : (
            <div className="rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              Join this bill first to add or change expenses.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Expense history
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Newest expenses appear first.
            </p>
          </div>
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Category
              <select
                name="category"
                defaultValue={category ?? ""}
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {EXPENSE_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Person
              <select
                name="participant"
                defaultValue={participantId ?? ""}
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Everyone</option>
                {bill.participants.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Filter
            </button>
            {category || participantId ? (
              <Link
                href={`/b/${shareToken}`}
                className="inline-flex min-h-10 items-center justify-center px-2 text-sm font-semibold text-teal-700"
              >
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        {ledgerError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900"
          >
            We couldn’t load the expenses. Refresh the page and try again.
          </div>
        ) : expenses.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-bold text-slate-950">
              {category || participantId
                ? "No expenses match these filters"
                : "No expenses yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
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
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-950">
                        {expense.description}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {displayDate(expense.expense_date)} · Paid by{" "}
                      {participantNames.get(expense.paid_by_participant_id)} ·{" "}
                      {expense.split_method === "equal"
                        ? "Equal split"
                        : "Exact split"}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-slate-950">
                    {formatMoney(expense.amount_minor, bill.currency)}
                  </p>
                </div>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {expense.shares.map((share) => (
                    <li
                      key={share.participantId}
                      className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700">
                        {participantNames.get(share.participantId)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(share.amountMinor, bill.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                {expense.notes ? (
                  <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                    {expense.notes}
                  </p>
                ) : null}

                {participant ? (
                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
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
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Recent changes</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {activity.map((item) => (
              <li key={item.id} className="py-3 text-sm first:pt-0 last:pb-0">
                <p className="font-medium text-slate-800">
                  {activityDescription(item, participantNames)}
                </p>
                <time className="mt-1 block text-xs text-slate-500">
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
    </div>
  );
}
