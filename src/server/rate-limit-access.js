import { guardOperation } from "@/server/rate-limits";
import {
  getBillByShareToken,
  getSessionParticipant,
  ParticipantSessionRequiredError,
} from "@/server/bills";
import { requireCreator } from "@/server/payment-methods";

export async function guardBillOperation(
  group,
  input,
  { joined = true, owner = false } = {},
) {
  if (owner) {
    const { bill, actor } = await requireCreator(input);
    await guardOperation(group, { billId: bill.id, participantId: actor.id });
    return;
  }
  const bill = await getBillByShareToken(input.shareToken);
  const actor = joined
    ? await getSessionParticipant(bill.id, input.cookieValue)
    : null;
  if (joined && !actor) throw new ParticipantSessionRequiredError();
  await guardOperation(group, { billId: bill.id, participantId: actor?.id });
}
