import { splitEqually } from "@/lib/money";

export const examplePeople = [
  {
    id: "nary",
    display_name: "Nary",
    initials: "NA",
    tone: "purple",
    is_creator: true,
  },
  { id: "sokha", display_name: "Sokha", initials: "SO", tone: "peach" },
  { id: "mali", display_name: "Mali", initials: "MA", tone: "green" },
];

export const exampleExpenses = [
  {
    id: "dinner",
    description: "Dinner at Malis",
    amount_minor: 7200,
    paid_by_participant_id: "nary",
    category: "Food & drinks",
    date: "2026-10-29",
    shares: splitEqually(7200, ["nary", "sokha", "mali"]),
    receipt: true,
    notes: "Good food, better company.",
  },
  {
    id: "ride",
    description: "Tuk-tuk home",
    amount_minor: 1200,
    paid_by_participant_id: "sokha",
    category: "Transport",
    date: "2026-10-29",
    shares: splitEqually(1200, ["nary", "sokha", "mali"]),
  },
  {
    id: "coffee",
    description: "Afternoon coffees",
    amount_minor: 1800,
    paid_by_participant_id: "nary",
    category: "Food & drinks",
    date: "2026-10-28",
    shares: splitEqually(1800, ["nary", "sokha"]),
  },
];

export const exampleReceipt = [
  {
    id: "amok",
    name: "Fish amok",
    amount: "22.00",
    people: ["nary", "sokha", "mali"],
  },
  {
    id: "greens",
    name: "Morning glory",
    amount: "8.00",
    people: ["nary", "sokha", "mali"],
  },
  {
    id: "tea",
    name: "Iced tea",
    amount: "9.00",
    people: ["nary", "sokha", "mali"],
  },
];
