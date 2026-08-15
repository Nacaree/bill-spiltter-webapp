import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { JoinBillForm } from "@/components/join-bill-form";
import { ShareBillButton } from "@/components/share-bill-button";
import { PARTICIPANT_COOKIE_NAME } from "@/lib/participant-session";
import {
  BillNotFoundError,
  getBillByShareToken,
  getSessionParticipant,
} from "@/server/bills";

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

export default async function BillPage({ params }) {
  const { shareToken } = await params;
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

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
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
                This device can add and update bill items when the expense
                ledger is enabled.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-950">
                Join this bill
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Joining remembers you on this device and lets you make changes.
              </p>
              <JoinBillForm shareToken={shareToken} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
