import { billIsActive } from "@/lib/bill-lifecycle";

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
export class ParticipantSessionRequiredError extends Error {}
export class ParticipantUnavailableError extends Error {}

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
  if (error.code === "P0001") throw new ParticipantSessionRequiredError();
  if (error.code === "P0003") throw new ParticipantUnavailableError();
  throw new Error(`Database operation failed (${error.code ?? "unknown"}).`);
}

function sessionFromCookie(cookieValue, expectedBillId) {
  const session = verifyParticipantSession(cookieValue, {
    expectedBillId,
    secrets: sessionSecrets(),
  });
  if (!session) throw new ParticipantSessionRequiredError();
  return session;
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
    .select(
      "id, name, currency, expires_at, archived_at, created_at, last_activity_at",
    )
    .eq("public_id_hash", shareHash)
    .maybeSingle();
  if (billError) throwDatabaseError(billError);
  if (!billIsActive(bill)) {
    throw new BillNotFoundError();
  }

  const { data: participants, error: participantError } = await supabase
    .from("bill_participants")
    .select("id, display_name, is_creator, session_token_hash, created_at")
    .eq("bill_id", bill.id)
    .is("deactivated_at", null)
    .order("created_at", { ascending: true });
  if (participantError) throwDatabaseError(participantError);

  return {
    ...bill,
    expiresSoon: Boolean(
      bill.expires_at &&
      new Date(bill.expires_at).getTime() - Date.now() <= 30 * 24 * 60 * 60_000,
    ),
    participants: participants.map(
      ({ session_token_hash: sessionTokenHash, ...participant }) => ({
        ...participant,
        canClaim: !sessionTokenHash,
      }),
    ),
  };
}

export async function getSessionParticipant(billId, cookieValue) {
  let session;
  try {
    session = sessionFromCookie(cookieValue, billId);
  } catch (error) {
    if (error instanceof ParticipantSessionRequiredError) return null;
    throw error;
  }

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

export async function claimParticipant({ participantId, shareToken }) {
  const participantAccess = createAccessToken();
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }

  const { data, error } = await getServerSupabase().rpc(
    "claim_bill_participant",
    {
      participant_session_hash: participantAccess.tokenHash,
      share_hash: shareHash,
      target_participant_id: participantId,
    },
  );
  if (error) throwDatabaseError(error);

  const claimed = resultRow(data);
  if (!claimed?.bill_id || !claimed?.participant_id) {
    throw new Error(
      "Database did not return the claimed participant identity.",
    );
  }

  const session = createParticipantSession({
    billId: claimed.bill_id,
    participantId: claimed.participant_id,
    secret: process.env.PARTICIPANT_SESSION_SECRET,
    sessionToken: participantAccess.token,
  });
  return { billId: claimed.bill_id, sessionValue: session.value };
}

export async function addParticipant({
  cookieValue,
  participantName,
  shareToken,
}) {
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }

  const session = sessionFromCookie(cookieValue);
  const { data, error } = await getServerSupabase().rpc(
    "add_bill_participant",
    {
      actor_participant_id: session.participantId,
      actor_session_hash: hashAccessToken(session.sessionToken),
      participant_name: participantName,
      share_hash: shareHash,
    },
  );
  if (error) throwDatabaseError(error);

  const added = resultRow(data);
  if (!added?.participant_id) {
    throw new Error("Database did not return the added participant identity.");
  }
  return { participantId: added.participant_id };
}

// Recheck at point of use rather than trusting a previously rendered bill.
export async function requireActiveBillId(billId) {
  const { data, error } = await getServerSupabase()
    .from("bills")
    .select("id, expires_at, archived_at")
    .eq("id", billId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!billIsActive(data)) throw new BillNotFoundError();
  return data;
}
