import { randomUUID } from "node:crypto";
import { OwnerQrSettings } from "@/components/owner-qr-settings";
import { PayOwnerQr } from "@/components/pay-owner-qr";
import {
  RemoveSettlementForm,
  SettlementForm,
} from "@/components/settlement-form";
import { formatMoney } from "@/lib/money";
import { paymentQrEligible } from "@/lib/payment-qr";
import { getPaymentMethod } from "@/server/payment-methods";
import { getBillLedger, PhaseThreeSetupError } from "@/server/settlements";

export async function BalancesSection({ bill, participant, shareToken }) {
  let ledger;
  let method;
  try {
    [ledger, method] = await Promise.all([
      getBillLedger(shareToken),
      getPaymentMethod(bill.id),
    ]);
  } catch (error) {
    const setup = error instanceof PhaseThreeSetupError;
    if (!setup) reportAppError(error, "balances_load");
    return (
      <section
        id="balances"
        className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6"
      >
        <h2 className="text-2xl font-bold text-slate-950">
          Balances & settle up
        </h2>
        <p role="alert" className="mt-3 text-sm text-amber-950">
          {setup
            ? "Balances and payments are not configured on this server yet."
            : "We couldn’t load balances. Refresh the page before recording a payment."}
        </p>
      </section>
    );
  }
  const names = new Map(ledger.participants.map((p) => [p.id, p.display_name]));
  const formBill = {
    participants: ledger.participants,
    currency: bill.currency,
    currentParticipantId: participant?.id,
    shareToken,
  };
  const settled = ledger.transfers.length === 0;
  const manualId = randomUUID();
  return (
    <section
      id="balances"
      className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-bold tracking-widest text-teal-700 uppercase">
        Settle up
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">
        Balances & payments
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Includes all confirmed expenses and recorded payments. Expense filters
        do not change these balances.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ledger.balances.map((person) => (
          <article
            key={person.id}
            className="min-w-0 rounded-2xl bg-slate-50 p-4"
          >
            <p className="font-semibold break-words text-slate-900">
              {person.display_name}
              {person.deactivated_at ? " (inactive)" : ""}
            </p>
            <p
              className={`mt-1 text-lg font-bold break-words ${person.netMinor < 0 ? "text-amber-800" : "text-teal-800"}`}
            >
              {person.netMinor === 0
                ? "Settled"
                : `${person.netMinor < 0 ? "Owes" : "Is owed"} ${formatMoney(Math.abs(person.netMinor), bill.currency)}`}
            </p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700">
                How this balance is calculated
              </summary>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-slate-600 [&_dd]:text-right [&_dd]:break-all">
                <dt>Paid for expenses</dt>
                <dd>{formatMoney(person.paidMinor, bill.currency)}</dd>
                <dt>Assigned shares</dt>
                <dd>−{formatMoney(person.shareMinor, bill.currency)}</dd>
                <dt>Payments sent</dt>
                <dd>+{formatMoney(person.sentMinor, bill.currency)}</dd>
                <dt>Payments received</dt>
                <dd>−{formatMoney(person.receivedMinor, bill.currency)}</dd>
              </dl>
              {person.entries.length ? (
                <ul className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                  {person.entries.map((entry) => (
                    <li key={entry.expenseId}>
                      <p className="font-medium break-words text-slate-800">
                        {entry.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Paid {formatMoney(entry.paidMinor, bill.currency)} ·
                        Share {formatMoney(entry.shareMinor, bill.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-slate-500">No expense contributions.</p>
              )}
            </details>
          </article>
        ))}
      </div>
      {settled ? (
        <div
          role="status"
          className="mt-6 rounded-2xl bg-teal-50 p-5 font-semibold text-teal-900"
        >
          {ledger.expenses.length || ledger.settlements.length
            ? "All settled! Everyone’s balance is zero."
            : "No payments needed. Add an expense to start splitting."}
        </div>
      ) : (
        <>
          <h3 className="mt-7 text-lg font-bold text-slate-950">
            Suggested transfers
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            These transfers settle everyone’s balance. Make the payment outside
            the app, then record it.
          </p>
          <div className="mt-4 grid gap-4">
            {ledger.transfers.map((transfer) => {
              const requestId = randomUUID();
              return (
                <article
                  key={`${transfer.fromParticipantId}-${transfer.toParticipantId}`}
                  className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5"
                >
                  <p className="font-semibold break-words text-slate-900">
                    {names.get(transfer.fromParticipantId)} →{" "}
                    {names.get(transfer.toParticipantId)}
                  </p>
                  <p className="mt-1 text-xl font-bold text-teal-800">
                    {formatMoney(transfer.amountMinor, bill.currency)}
                  </p>
                  {paymentQrEligible(method, {
                    ...transfer,
                    currency: bill.currency,
                  }) ? (
                    <PayOwnerQr
                      key={`${method.id}-${method.updated_at}-${transfer.amountMinor}`}
                      shareToken={shareToken}
                      transfer={transfer}
                    />
                  ) : null}
                  {participant ? (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-teal-700">
                        Record this payment
                      </summary>
                      <div className="mt-4">
                        <SettlementForm
                          key={requestId}
                          settlementId={requestId}
                          bill={formBill}
                          transfer={transfer}
                        />
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
      {participant && ledger.participants.length > 1 ? (
        <details className="mt-6 border-t border-slate-100 pt-5">
          <summary className="cursor-pointer font-semibold text-teal-700">
            Record another payment
          </summary>
          <p className="mt-3 text-sm text-slate-600">
            Record the actual amount transferred, including partial payments.
            This updates the remaining balances.
          </p>
          <div className="mt-4">
            <SettlementForm
              key={manualId}
              bill={formBill}
              settlementId={manualId}
            />
          </div>
        </details>
      ) : !participant ? (
        <p className="mt-5 text-sm text-slate-600">
          Join this bill to record or correct payments.
        </p>
      ) : null}
      <h3 className="mt-7 text-lg font-bold text-slate-950">Payment history</h3>
      {ledger.settlements.length ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {ledger.settlements.map((payment) => (
            <li key={payment.id} className="py-4 first:pt-0">
              <p className="font-semibold break-words text-slate-900">
                {names.get(payment.from_participant_id)} paid{" "}
                {names.get(payment.to_participant_id)}{" "}
                {formatMoney(payment.amount_minor, bill.currency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {payment.settled_at.slice(0, 10)} · Recorded by{" "}
                {names.get(payment.created_by_participant_id)}
              </p>
              {payment.notes ? (
                <p className="mt-2 text-sm break-words whitespace-pre-wrap text-slate-600">
                  {payment.notes}
                </p>
              ) : null}
              {participant ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-teal-700">
                    Correct payment record
                  </summary>
                  <div className="mt-4">
                    <SettlementForm
                      key={payment.updated_at}
                      bill={formBill}
                      settlement={payment}
                    />
                    <RemoveSettlementForm
                      settlement={payment}
                      shareToken={shareToken}
                    />
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>
      )}
      {participant?.is_creator ? (
        <OwnerQrSettings
          key={method?.updated_at ?? "none"}
          method={method}
          currency={bill.currency}
          shareToken={shareToken}
        />
      ) : null}
    </section>
  );
}
import { reportAppError } from "@/server/monitoring";
