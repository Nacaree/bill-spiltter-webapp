// Pure helpers shared by reads and private image-link issuance.
export function billIsActive(bill, now = Date.now()) {
  return Boolean(
    bill &&
    !bill.archived_at &&
    (!bill.expires_at || new Date(bill.expires_at).getTime() > now),
  );
}

export function receiptIsAvailable(scan, now = Date.now()) {
  return Boolean(
    scan &&
    scan.status !== "expired" &&
    (scan.status === "confirmed" || new Date(scan.expires_at).getTime() > now),
  );
}

export function imageLinkLifetime(deadlines, maximum, now = Date.now()) {
  return Math.max(
    0,
    Math.min(
      maximum,
      ...deadlines
        .filter(Boolean)
        .map((date) => Math.floor((new Date(date).getTime() - now) / 1000)),
    ),
  );
}
