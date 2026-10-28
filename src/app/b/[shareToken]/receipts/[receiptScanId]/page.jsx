import { ReceiptImage } from "@/components/receipt-image";
import { readableWait } from "@/lib/rate-limit-error";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/expense-form";
import { ReceiptReviewForm } from "@/components/receipt-review-form";
import { ReceiptStatusRefresh } from "@/components/receipt-status-refresh";
import { RetryReceiptForm } from "@/components/retry-receipt-form";
import { PARTICIPANT_COOKIE_NAME } from "@/lib/participant-session";
import {
  BillNotFoundError,
  getBillByShareToken,
  getSessionParticipant,
} from "@/server/bills";
import { getReceiptForEditing, ReceiptNotFoundError } from "@/server/receipts";

const errorMessages = {
  extraction_timed_out:
    "Receipt scanning took too long. You can retry safely or enter the expense manually.",
  extraction_failed: "The extraction service couldn’t read this receipt.",
  image_conversion_failed:
    "The receipt could not be converted for OCR. Try a JPEG or PNG image.",
  image_unavailable: "The uploaded image could not be opened.",
  invalid_provider_response: "The extraction result was incomplete or invalid.",
  no_text_detected:
    "No readable text was found. Try a sharper, brighter receipt image.",
  receipt_image_too_large:
    "The image stayed too large for receipt scanning. Try a smaller image.",
  provider_auth_failed:
    "Receipt scanning credentials need attention. Enter it manually for now.",
  provider_model_unavailable:
    "The receipt scanning model is unavailable. Enter it manually for now.",
  provider_failed: "The extraction provider returned an error.",
  provider_not_configured:
    "Receipt extraction is not configured on this server yet.",
  provider_rate_limited:
    "The extraction provider is busy. Wait a moment and retry.",
  provider_unavailable: "The extraction provider could not be reached.",
};

export const metadata = { title: "Review receipt" };

export const runtime = "nodejs";
export const maxDuration = 120;

export default async function ReceiptPage({ params, searchParams }) {
  const { receiptScanId, shareToken } = await params;
  const editing = (await searchParams)?.edit === "1";
  let bill;
  let scan;
  try {
    bill = await getBillByShareToken(shareToken);
    scan = await getReceiptForEditing(bill.id, receiptScanId);
  } catch (error) {
    if (
      error instanceof BillNotFoundError ||
      error instanceof ReceiptNotFoundError
    ) {
      notFound();
    }
    throw error;
  }
  const cookieStore = await cookies();
  const participant = await getSessionParticipant(
    bill.id,
    cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
  );
  const formBill = {
    currency: bill.currency,
    currentParticipantId: participant?.id,
    participants: (scan.reviewParticipants ?? bill.participants).map(
      ({ display_name, id, deactivated_at }) => ({
        display_name,
        id,
        deactivated_at,
      }),
    ),
    shareToken,
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/b/${shareToken}`}
        className="text-brand inline-flex min-h-11 items-center text-sm font-semibold"
      >
        ← Back to {bill.name}
      </Link>
      <div className="mt-6">
        <p className="text-brand text-sm font-bold tracking-widest uppercase">
          Receipt import
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-bold">
          {editing && scan.status === "confirmed"
            ? "Edit receipt"
            : "Review receipt"}
        </h1>
        <p className="text-muted mt-2">{scan.original_filename}</p>
      </div>

      {!participant ? (
        <div className="rounded-control mt-8 bg-amber-50 p-6 text-amber-950">
          Join the bill on this device before reviewing or confirming this
          receipt.
        </div>
      ) : null}

      {(scan.status === "uploaded" || scan.status === "processing") &&
      !scan.canRetry ? (
        <div className="rounded-card border-line mt-8 border bg-white p-8 text-center shadow-sm">
          <ReceiptStatusRefresh />
          <div className="border-tint border-t-brand mx-auto size-8 animate-spin rounded-full border-4" />
          <h2 className="text-foreground mt-5 text-xl font-bold">
            Reading your receipt…
          </h2>
          <p className="text-muted mt-2 text-sm">
            This page refreshes automatically. You can safely return to the bill
            and come back later.
          </p>
        </div>
      ) : null}

      {scan.status === "failed" || scan.canRetry ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-card border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-950">
              {scan.error_code === "app_rate_limited"
                ? "Scanning temporarily unavailable"
                : "Extraction failed"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-900">
              {scan.error_code === "app_rate_limited"
                ? `Receipt scanning is temporarily unavailable.${scan.retryAfterSeconds > 0 ? ` Try again in ${readableWait(scan.retryAfterSeconds)}.` : " You can retry now."} You can enter the expense manually below.`
                : (errorMessages[
                    scan.canRetry && scan.status !== "failed"
                      ? "extraction_timed_out"
                      : scan.error_code
                  ] ?? errorMessages.extraction_failed)}
            </p>
            {participant ? (
              <div className="mt-5">
                <RetryReceiptForm
                  receiptScanId={scan.id}
                  shareToken={shareToken}
                />
              </div>
            ) : null}
          </div>
          {participant ? (
            <div className="app-panel">
              <h2 className="text-foreground text-xl font-bold">
                Enter it manually instead
              </h2>
              <p className="text-muted mt-2 mb-6 text-sm">
                Any available merchant, date, and total are prefilled below.
              </p>
              <ExpenseForm
                bill={formBill}
                defaults={{
                  amountMinor: scan.total_minor,
                  description: scan.merchant_name,
                  expenseDate: scan.receipt_date,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {(scan.status === "needs_review" ||
        (scan.status === "confirmed" && editing && scan.expense)) &&
      participant ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <aside className="rounded-card border-line min-w-0 border bg-white p-4 shadow-sm lg:sticky lg:top-6">
            <ReceiptImage src={scan.imageUrl} />
            {scan.currency !== bill.currency ? (
              <div className="rounded-control mt-4 bg-red-50 p-4 text-sm text-red-900">
                Extracted currency {scan.currency} does not match this bill’s{" "}
                {bill.currency}. Values will be saved in {bill.currency}; check
                every amount carefully.
              </div>
            ) : null}
          </aside>
          <section className="app-panel min-w-0">
            {scan.items.some((item) => item.needs_review) ? (
              <div className="rounded-control mb-6 bg-amber-50 p-4 text-sm text-amber-950">
                Some extracted lines are low confidence. Check the highlighted
                items before confirming.
              </div>
            ) : null}
            <ReceiptReviewForm
              bill={formBill}
              confirmationKey={crypto.randomUUID()}
              scan={scan}
            />
          </section>
        </div>
      ) : null}

      {scan.status === "confirmed" &&
      !(editing && participant && scan.expense) ? (
        <div className="rounded-card border-line bg-tint mt-8 border p-8 text-center">
          <h2 className="text-brand text-xl font-bold">Receipt confirmed</h2>
          <p className="text-brand mt-2 text-sm">
            {scan.expense ? "Its expense is now part of the bill ledger. " : ""}
            The receipt image stays until the bill is deleted.
          </p>
          {!scan.expense && (
            <p className="text-muted mt-3 text-sm">
              The linked expense was removed and cannot be edited.
            </p>
          )}
          {participant && scan.expense && (
            <Link
              href={`/b/${shareToken}/receipts/${scan.id}?edit=1`}
              className="text-brand mt-5 inline-flex min-h-11 items-center px-4 font-semibold underline"
            >
              Edit receipt
            </Link>
          )}
          <div className="mt-5">
            <ReceiptImage src={scan.imageUrl} />
          </div>
          <Link
            href={`/b/${shareToken}`}
            className="rounded-control bg-brand mt-5 inline-flex min-h-11 items-center px-5 text-sm font-semibold text-white"
          >
            View bill
          </Link>
        </div>
      ) : null}
    </div>
  );
}
