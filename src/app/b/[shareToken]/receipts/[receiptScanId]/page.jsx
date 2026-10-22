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
import { getReceiptScan, ReceiptNotFoundError } from "@/server/receipts";

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

export default async function ReceiptPage({ params }) {
  const { receiptScanId, shareToken } = await params;
  let bill;
  let scan;
  try {
    bill = await getBillByShareToken(shareToken);
    scan = await getReceiptScan(bill.id, receiptScanId);
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
    participants: bill.participants.map(({ display_name, id }) => ({
      display_name,
      id,
    })),
    shareToken,
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/b/${shareToken}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700"
      >
        ← Back to {bill.name}
      </Link>
      <div className="mt-6">
        <p className="text-sm font-bold tracking-widest text-teal-700 uppercase">
          Receipt import
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Review receipt
        </h1>
        <p className="mt-2 text-slate-600">{scan.original_filename}</p>
      </div>

      {!participant ? (
        <div className="mt-8 rounded-2xl bg-amber-50 p-6 text-amber-950">
          Join the bill on this device before reviewing or confirming this
          receipt.
        </div>
      ) : null}

      {(scan.status === "uploaded" || scan.status === "processing") &&
      !scan.canRetry ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ReceiptStatusRefresh />
          <div className="mx-auto size-8 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
          <h2 className="mt-5 text-xl font-bold text-slate-950">
            Reading your receipt…
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This page refreshes automatically. You can safely return to the bill
            and come back later.
          </p>
        </div>
      ) : null}

      {scan.status === "failed" || scan.canRetry ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
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
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Enter it manually instead
              </h2>
              <p className="mt-2 mb-6 text-sm text-slate-600">
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

      {scan.status === "needs_review" && participant ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
            <ReceiptImage src={scan.imageUrl} />
            {scan.currency !== bill.currency ? (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-900">
                Extracted currency {scan.currency} does not match this bill’s{" "}
                {bill.currency}. Values will be confirmed in {bill.currency};
                check every amount carefully.
              </div>
            ) : null}
          </aside>
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {scan.items.some((item) => item.needs_review) ? (
              <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
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

      {scan.status === "confirmed" ? (
        <div className="mt-8 rounded-3xl border border-teal-200 bg-teal-50 p-8 text-center">
          <h2 className="text-xl font-bold text-teal-950">Receipt confirmed</h2>
          <p className="mt-2 text-sm text-teal-900">
            Its expense is now part of the bill ledger. The receipt image stays
            until the bill is deleted.
          </p>
          <div className="mt-5">
            <ReceiptImage src={scan.imageUrl} />
          </div>
          <Link
            href={`/b/${shareToken}`}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white"
          >
            View bill
          </Link>
        </div>
      ) : null}
    </div>
  );
}
