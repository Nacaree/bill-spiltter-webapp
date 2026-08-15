import {
  createAccessToken,
  createBillAccess,
  hashAccessToken,
} from "@/lib/access-tokens";
import {
  createParticipantSession,
  verifyParticipantSession,
} from "@/lib/participant-session";
import { getServerSupabase } from "@/lib/supabase-server";

export class BillNotFoundError extends Error {}
export class ParticipantNameTakenError extends Error {}

function resultRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function sessionSecrets() {
  const secrets = [process.env.PARTICIPANT_SESSION_SECRET];
  if (process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET) {
    secrets.push(process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET);
  }
  return secrets;
}

function throwDatabaseError(error) {
  if (error.code === "23505") throw new ParticipantNameTakenError();
  if (error.code === "P0002") throw new BillNotFoundError();
  throw new Error(`Database operation failed (${error.code ?? "unknown"}).`);
}

export async function createBillWithCreator({
  billName,
  currency,
  participantName,
}) {
  const access = createBillAccess();
  const participantAccess = createAccessToken();
  const { data, error } = await getServerSupabase().rpc(
    "create_bill_with_creator",
    {
      bill_currency: currency,
      bill_name: billName,
      creator_name: participantName,
      participant_session_hash: participantAccess.tokenHash,
      recovery_hash: access.creator.tokenHash,
      share_hash: access.share.tokenHash,
    },
  );
  if (error) throwDatabaseError(error);

  const created = resultRow(data);
  if (!created?.bill_id || !created?.participant_id) {
    throw new Error("Database did not return the created bill identity.");
  }

  const session = createParticipantSession({
    billId: created.bill_id,
    participantId: created.participant_id,
    secret: process.env.PARTICIPANT_SESSION_SECRET,
    sessionToken: participantAccess.token,
  });

  return {
    billId: created.bill_id,
    recoveryToken: access.creator.token,
    sessionValue: session.value,
    shareToken: access.share.token,
  };
}

export async function getBillByShareToken(shareToken) {
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }

  const supabase = getServerSupabase();
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, name, currency, expires_at, archived_at, created_at")
    .eq("public_id_hash", shareHash)
    .maybeSingle();
  if (billError) throwDatabaseError(billError);
  if (
    !bill ||
    bill.archived_at ||
    (bill.expires_at && new Date(bill.expires_at).getTime() <= Date.now())
  ) {
    throw new BillNotFoundError();
  }

  const { data: participants, error: participantError } = await supabase
    .from("bill_participants")
    .select("id, display_name, is_creator, created_at")
    .eq("bill_id", bill.id)
    .is("deactivated_at", null)
    .order("created_at", { ascending: true });
  if (participantError) throwDatabaseError(participantError);

  return { ...bill, participants };
}

export async function getSessionParticipant(billId, cookieValue) {
  const session = verifyParticipantSession(cookieValue, {
    expectedBillId: billId,
    secrets: sessionSecrets(),
  });
  if (!session) return null;

  const { data, error } = await getServerSupabase()
    .from("bill_participants")
    .select("id, display_name, is_creator")
    .eq("id", session.participantId)
    .eq("bill_id", billId)
    .eq("session_token_hash", hashAccessToken(session.sessionToken))
    .is("deactivated_at", null)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  return data;
}

export async function joinBill({ participantName, shareToken }) {
  const participantAccess = createAccessToken();
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }

  const { data, error } = await getServerSupabase().rpc("join_bill", {
    participant_name: participantName,
    participant_session_hash: participantAccess.tokenHash,
    share_hash: shareHash,
  });
  if (error) throwDatabaseError(error);

  const joined = resultRow(data);
  if (!joined?.bill_id || !joined?.participant_id) {
    throw new Error("Database did not return the joined participant identity.");
  }

  const session = createParticipantSession({
    billId: joined.bill_id,
    participantId: joined.participant_id,
    secret: process.env.PARTICIPANT_SESSION_SECRET,
    sessionToken: participantAccess.token,
  });
  return { billId: joined.bill_id, sessionValue: session.value };
}
