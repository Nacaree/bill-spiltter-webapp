import { hashAccessToken } from "@/lib/access-tokens";
import { calculateBalances, suggestTransfers } from "@/lib/balances";
import { verifyParticipantSession } from "@/lib/participant-session";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  BillNotFoundError,
  ParticipantSessionRequiredError,
} from "@/server/bills";

export class SettlementValidationError extends Error {}
export class PhaseThreeSetupError extends Error {}

export function phaseThreeError(error) {
  if (["42P01", "PGRST202", "PGRST205", "42883"].includes(error.code))
    return new PhaseThreeSetupError();
  if (error.code === "P0001") return new ParticipantSessionRequiredError();
  if (error.code === "P0002") return new BillNotFoundError();
  if (error.code === "P0004")
    return new SettlementValidationError(error.message);
  return new Error(`Database operation failed (${error.code ?? "unknown"}).`);
}

export function settlementAccess(shareToken, cookieValue) {
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }
  const session = verifyParticipantSession(cookieValue, {
    secrets: [
      process.env.PARTICIPANT_SESSION_SECRET,
      process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET,
    ].filter(Boolean),
  });
  if (!session) throw new ParticipantSessionRequiredError();
  return {
    share_hash: shareHash,
    actor_participant_id: session.participantId,
    actor_session_hash: hashAccessToken(session.sessionToken),
  };
}

export async function getBillLedger(shareToken) {
  const { data, error } = await getServerSupabase().rpc("get_bill_ledger", {
    share_hash: hashAccessToken(shareToken),
  });
  if (error) throw phaseThreeError(error);
  if (!data) throw new BillNotFoundError();
  const ledger = {
    participants: data.participants,
    expenses: data.expenses.map((e) => ({
      ...e,
      amount_minor: Number(e.amount_minor),
      shares: e.shares.map((s) => ({
        ...s,
        amountMinor: Number(s.amountMinor),
      })),
    })),
    settlements: data.settlements.map((s) => ({
      ...s,
      amount_minor: Number(s.amount_minor),
    })),
  };
  const balances = calculateBalances(ledger);
  return { ...ledger, balances, transfers: suggestTransfers(balances) };
}

export async function saveSettlement({
  cookieValue,
  shareToken,
  operation,
  settlementId,
  fromParticipantId,
  toParticipantId,
  amountMinor,
  settledDate,
  notes,
  expectedUpdatedAt,
}) {
  const { data, error } = await getServerSupabase().rpc(
    "save_bill_settlement",
    {
      ...settlementAccess(shareToken, cookieValue),
      target_settlement_id: settlementId,
      operation,
      sender_id: fromParticipantId,
      recipient_id: toParticipantId,
      payment_amount_minor: amountMinor,
      payment_date: settledDate,
      payment_notes: notes,
      expected_updated_at: expectedUpdatedAt,
    },
  );
  if (error) throw phaseThreeError(error);
  return { settlementId: data };
}
