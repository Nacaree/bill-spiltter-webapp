// Recognize explicit vehicle names; an ambiguous name keeps the default taxi.
export function getTransportIconName(name = "") {
  const words =
    String(name ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const text = ` ${words.join(" ")} `;
  if (/ (?:tuk ?tuks?|rickshaws?) /.test(text)) return "tuk-tuk";
  if (
    / (?:motor ?bikes?|motor ?cycles?|moto ?bikes?|motos?|motodops?|scooters?|grab ?bikes?|bike taxis?) /.test(
      text,
    )
  )
    return "motorbike";
  return "car";
}
