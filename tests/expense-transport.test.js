import { describe, expect, it } from "vitest";
import { getTransportIconName } from "@/lib/expense-transport";

describe("transport icons from expense names", () => {
  it.each([
    "Tuk-tuk home",
    "tuk tuk to dinner",
    "TUKTUK airport",
    "Tuk–tuk ride",
    "Two tuk-tuks",
    "Rickshaw fare",
    "Auto-rickshaw to the market",
  ])("recognizes a tuk-tuk: %s", (name) => {
    expect(getTransportIconName(name)).toBe("tuk-tuk");
  });
  it.each([
    "Motorbike taxi",
    "Motor bike home",
    "Motobike rental",
    "Motorcycle ride",
    "Motor-cycle fare",
    "Moto taxi",
    "Motodop fare",
    "Scooter rental",
    "GrabBike home",
    "Grab bike ride",
    "Bike taxi fare",
  ])("recognizes a motorbike: %s", (name) => {
    expect(getTransportIconName(name)).toBe("motorbike");
  });
  it.each([
    "Taxi to airport",
    "Car rental",
    "Grab home",
    "PassApp ride",
    "Bike repair",
    "Automotive supplies",
    "Motown tickets",
    "Scooterama",
    "Tuktukology",
    "",
    null,
  ])("keeps the car for an unclear or unrelated name: %s", (name) => {
    expect(getTransportIconName(name)).toBe("car");
  });
  it("prefers the explicit tuk-tuk when a description mentions both vehicles", () => {
    expect(getTransportIconName("Tuk-tuk and motorbike rides")).toBe("tuk-tuk");
  });
});
