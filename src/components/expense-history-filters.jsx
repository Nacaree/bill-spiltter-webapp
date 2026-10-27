"use client";

import { SelectControl } from "@/components/ui/select";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-input";

export function ExpenseHistoryFilters({
  category,
  participantId,
  participants,
  shareToken,
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useOptimistic(
    { category, participantId },
    (current, update) => ({ ...current, ...update }),
  );

  function applyFilters(update) {
    const nextFilters = { ...filters, ...update };
    const params = new URLSearchParams();
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.participantId)
      params.set("participant", nextFilters.participantId);
    const query = params.toString();
    startTransition(() => {
      setFilters(update);
      router.replace(`/b/${shareToken}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    });
  }

  return (
    <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
      <label className="text-foreground grid gap-1 text-xs font-semibold">
        Category
        <SelectControl
          aria-label="Category"
          name="category"
          value={filters.category}
          onChange={(event) => applyFilters({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {EXPENSE_CATEGORY_LABELS[item]}
            </option>
          ))}
        </SelectControl>
      </label>
      <label className="text-foreground grid gap-1 text-xs font-semibold">
        Person
        <SelectControl
          person
          aria-label="Person"
          name="participant"
          value={filters.participantId}
          onChange={(event) =>
            applyFilters({ participantId: event.target.value })
          }
        >
          <option value="">Everyone</option>
          {participants.map((person) => (
            <option key={person.id} value={person.id}>
              {person.display_name}
            </option>
          ))}
        </SelectControl>
      </label>
      {filters.category || filters.participantId ? (
        <Link
          href={`/b/${shareToken}`}
          scroll={false}
          className="text-brand inline-flex min-h-10 items-center justify-center px-2 text-sm font-semibold"
        >
          Clear
        </Link>
      ) : null}
    </div>
  );
}
