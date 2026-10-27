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
        className="rounded-card mt-8 border border-amber-200 bg-amber-50 p-6"
      >
        <h2 className="text-foreground text-2xl font-bold">
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
    <section id="balances" className="app-panel mt-8">
      <p className="text-brand text-sm font-bold tracking-widest uppercase">
        Settle up
      </p>
      <h2 className="text-foreground mt-2 text-2xl font-bold">
        Balances & payments
      </h2>
      <p className="text-muted mt-2 text-sm leading-6">
        Includes all confirmed expenses and recorded payments. Expense filters
        do not change these balances.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ledger.balances.map((person) => (
          <article
            key={person.id}
            className="glass-summary min-w-0 p-[var(--ds-panel-padding)]"
          >
            <p
              id={`balance-${person.id}-name`}
              className="text-foreground font-semibold break-words"
            >
              {person.display_name}
              {person.deactivated_at ? " (inactive)" : ""}
            </p>
            <p
              className={`mt-1 text-lg font-bold break-words ${person.netMinor < 0 ? "text-amber-800" : "text-brand"}`}
            >
              {person.netMinor === 0
                ? "Settled"
                : `${person.netMinor < 0 ? "Owes" : "Is owed"} ${formatMoney(Math.abs(person.netMinor), bill.currency)}`}
            </p>
            <details className="mt-3 text-sm">
              <summary
                aria-describedby={`balance-${person.id}-name`}
                className="text-foreground cursor-pointer font-semibold"
              >
                How this balance is calculated
              </summary>
              <dl className="text-muted mt-3 grid grid-cols-2 gap-2 [&_dd]:text-right [&_dd]:break-all">
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
                <ul className="border-line mt-3 space-y-3 border-t pt-3">
                  {person.entries.map((entry) => (
                    <li key={entry.expenseId}>
                      <p className="text-foreground font-medium break-words">
                        {entry.description}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        Paid {formatMoney(entry.paidMinor, bill.currency)} ·
                        Share {formatMoney(entry.shareMinor, bill.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-3">No expense contributions.</p>
              )}
            </details>
          </article>
        ))}
      </div>
      {settled ? (
        <div
          role="status"
          className="rounded-control bg-tint text-brand mt-6 p-5 font-semibold"
        >
          {ledger.expenses.length || ledger.settlements.length
            ? "All settled! Everyone’s balance is zero."
            : "No payments needed. Add an expense to start splitting."}
        </div>
      ) : (
        <>
          <h3 className="text-foreground mt-7 text-lg font-bold">
            Suggested transfers
          </h3>
          <p className="text-muted mt-1 text-sm">
            These transfers settle everyone’s balance. Make the payment outside
            the app, then record it.
          </p>
          <div className="mt-4 grid gap-4">
            {ledger.transfers.map((transfer) => {
              const requestId = randomUUID();
              return (
                <article
                  key={`${transfer.fromParticipantId}-${transfer.toParticipantId}`}
                  className="rounded-card border-line min-w-0 border p-4 sm:p-5"
                >
                  <p
                    id={`transfer-${requestId}`}
                    className="text-foreground font-semibold break-words"
                  >
                    {names.get(transfer.fromParticipantId)} →{" "}
                    {names.get(transfer.toParticipantId)}
                  </p>
                  <p className="text-brand mt-1 text-xl font-bold">
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
                      <summary
                        aria-describedby={`transfer-${requestId}`}
                        className="text-brand cursor-pointer text-sm font-semibold"
                      >
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
        <details className="border-line mt-6 border-t pt-5">
          <summary className="text-brand cursor-pointer font-semibold">
            Record another payment
          </summary>
          <p className="text-muted mt-3 text-sm">
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
        <p className="text-muted mt-5 text-sm">
          Join this bill to record or correct payments.
        </p>
      ) : null}
      <h3 className="text-foreground mt-7 text-lg font-bold">
        Payment history
      </h3>
      {ledger.settlements.length ? (
        <ul className="divide-line mt-4 divide-y">
          {ledger.settlements.map((payment) => (
            <li key={payment.id} className="py-4 first:pt-0">
              <p
                id={`payment-${payment.id}`}
                className="text-foreground font-semibold break-words"
              >
                {names.get(payment.from_participant_id)} paid{" "}
                {names.get(payment.to_participant_id)}{" "}
                {formatMoney(payment.amount_minor, bill.currency)}
              </p>
              <p className="text-muted mt-1 text-xs">
                {payment.settled_at.slice(0, 10)} · Recorded by{" "}
                {names.get(payment.created_by_participant_id)}
              </p>
              {payment.notes ? (
                <p className="text-muted mt-2 text-sm break-words whitespace-pre-wrap">
                  {payment.notes}
                </p>
              ) : null}
              {participant ? (
                <details className="mt-3">
                  <summary
                    aria-describedby={`payment-${payment.id}`}
                    className="text-brand cursor-pointer text-sm font-semibold"
                  >
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
        <p className="text-muted mt-3 text-sm">No payments recorded yet.</p>
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
