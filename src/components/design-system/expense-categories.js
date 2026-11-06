import { Coffee } from "./icons/animate-ui/coffee";
import { ShoppingBag } from "./icons/animate-ui/shopping-bag";
import { House } from "./icons/animate-ui/house";
import { Cross } from "./icons/animate-ui/cross";
import { Gift } from "./icons/animate-ui/gift";
import { Tag } from "./icons/animate-ui/tag";
import { getTransportIconName } from "@/lib/expense-transport";
import {
  Utensils,
  ShoppingBasket,
  Car,
  TukTuk,
  Motorbike,
  Fuel,
  Wine,
  BedDouble,
  Ticket,
  Plane,
  Plug,
} from "./icons/expense-categories";

export const expenseCategories = [
  {
    id: "meals",
    label: "Meals & restaurants",
    icon: "utensils",
    Icon: Utensils,
    food: true,
  },
  {
    id: "coffee",
    label: "Coffee & snacks",
    icon: "coffee",
    Icon: Coffee,
    food: true,
  },
  {
    id: "groceries",
    label: "Groceries",
    icon: "shopping-basket",
    Icon: ShoppingBasket,
    food: true,
  },
  { id: "transport", label: "Transport & taxis", icon: "car", Icon: Car },
  { id: "fuel", label: "Fuel", icon: "fuel", Icon: Fuel },
  {
    id: "drinks",
    label: "Drinks & nightlife",
    icon: "wine",
    Icon: Wine,
    food: true,
  },
  {
    id: "accommodation",
    label: "Hotels & accommodation",
    icon: "bed-double",
    Icon: BedDouble,
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "shopping-bag",
    Icon: ShoppingBag,
  },
  {
    id: "entertainment",
    label: "Activities & entertainment",
    icon: "ticket",
    Icon: Ticket,
  },
  { id: "travel", label: "Flights & travel", icon: "plane", Icon: Plane },
  {
    id: "household",
    label: "Rent & household bills",
    icon: "house",
    Icon: House,
  },
  { id: "utilities", label: "Utilities", icon: "plug", Icon: Plug },
  { id: "health", label: "Health & pharmacy", icon: "cross", Icon: Cross },
  { id: "gifts", label: "Gifts", icon: "gift", Icon: Gift },
  { id: "other", label: "Other", icon: "tag", Icon: Tag },
];

const legacyCategories = { "Food & drinks": "meals", Transport: "transport" };

export function getExpenseCategory(value, name = "") {
  const category = legacyCategories[value] ?? value;
  const resolved =
    expenseCategories.find(
      ({ id, label }) => id === category || label === category,
    ) ?? expenseCategories[expenseCategories.length - 1];
  if (resolved.id !== "transport") return resolved;
  const icon = getTransportIconName(name);
  const transport = {
    car: { Icon: Car, transportLabel: "Car / taxi" },
    "tuk-tuk": { Icon: TukTuk, transportLabel: "Tuk-tuk" },
    motorbike: { Icon: Motorbike, transportLabel: "Motorbike" },
  }[icon];
  return { ...resolved, ...transport, icon };
}
