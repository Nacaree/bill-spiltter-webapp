"use client";

import { useId, useSyncExternalStore } from "react";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { formatMoney } from "@/lib/money";
import { expenseForPreview } from "@/lib/expense-preview";
import { DesignButton } from "./primitives";
import { ExpenseCategoryIcon } from "./expense-category-icon";
import { getExpenseCategory } from "./expense-categories";
import { ExpenseSearch } from "./expense-search";
import { ButtonStrokeShimmer } from "./button-stroke-shimmer";
import { ExpenseEmptyArt } from "./expense-empty-art";
import styles from "./expenses-showcase.module.css";

const money = (amount) => formatMoney(amount, "USD");
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const defaultFilters = ["All", "Your expenses", "Receipts"];

export function AtelierExpenses({
  expenses,
  participants,
  currentParticipantId,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onAdd,
  onOpen,
  addButtonRef,
  playing = true,
  filters = defaultFilters,
  searchId,
  listId,
  emptyHeading: EmptyHeading = "h2",
  searchDesign = "tint",
  searchEffect = "morph-press",
  searchSurface = "borderless",
  searchClearMotion = "pop",
}) {
  const id = useId();
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const items = expenses
    .map((expense) =>
      expenseForPreview(expense, participants, currentParticipantId),
    )
    .sort((left, right) => right.dateISO.localeCompare(left.dateISO));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const personalShare = items.reduce((sum, item) => sum + item.share, 0);
  const visible = items.filter((item) => {
    const category = getExpenseCategory(item.category, item.name);
    return (
      (filter !== "Your expenses" ||
        item.people.includes(currentParticipantId)) &&
      (filter !== "Paid by you" || item.payerId === currentParticipantId) &&
      (filter !== "Receipts" || item.receipt) &&
      `${item.name} ${item.payer} ${item.category} ${category.label}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
  const months = [...new Set(items.map((item) => item.dateISO.slice(0, 7)))];
  const period =
    months.length === 1
      ? new Intl.DateTimeFormat("en-GB", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
          .format(new Date(`${months[0]}-01T12:00:00Z`))
          .toUpperCase()
      : "ALL EXPENSES";

  function clearFilters() {
    onQueryChange("");
    onFilterChange("All");
  }

  return (
    <div className={styles.atelier} data-atelier-expenses>
      <div className={styles.premiumSummary}>
        <div className={styles.premiumKicker}>
          <span>Total spent</span>
        </div>
        <div className={styles.premiumAmount}>
          <strong>
            <AnimatedMoney amountMinor={total} />
          </strong>
          <span>USD</span>
        </div>
        <div className={styles.personalLine}>
          <span>
            Your share <strong>{money(personalShare)}</strong>
          </span>
          <span>
            {items.length} {items.length === 1 ? "expense" : "expenses"}
          </span>
        </div>
      </div>
      <div className={styles.atelierTools}>
        <DesignButton
          disabled={!ready}
          ref={addButtonRef}
          icon="plus"
          onClick={onAdd}
          className={styles.stackAdd}
        >
          {(icon) => (
            <>
              <ButtonStrokeShimmer playing={playing} />
              {icon}
              <span>Add expense</span>
            </>
          )}
        </DesignButton>
        {items.length > 0 && (
          <ExpenseSearch
            key={`${searchDesign}-${searchEffect}-${searchSurface}-${searchClearMotion}`}
            id={searchId ?? `${id}-search`}
            label="Search expenses"
            design={searchDesign}
            effect={searchEffect}
            surface={searchSurface}
            clearMotion={searchClearMotion}
            filters={filters}
            value={query}
            onValueChange={onQueryChange}
            filter={filter}
            onFilterChange={onFilterChange}
          />
        )}
      </div>
      {visible.length > 0 ? (
        <div className={styles.ledger} id={listId}>
          <div className={styles.listHeading}>
            {months.length === 1 ? (
              <time dateTime={months[0]}>{period}</time>
            ) : (
              <span>{period}</span>
            )}
          </div>
          <ul>
            {visible.map((item) => (
              <li key={item.id} className={styles.entry}>
                <button
                  type="button"
                  disabled={!ready}
                  className={styles.entryButton}
                  onClick={(event) =>
                    onOpen(
                      expenses.find((expense) => expense.id === item.id),
                      event,
                    )
                  }
                >
                  <ExpenseCategoryIcon
                    category={item.category}
                    name={item.name}
                    size={20}
                    className={styles.categoryIcon}
                  />
                  <span className={styles.entryCopy}>
                    <strong>{item.name}</strong>
                    <span>
                      Paid by {item.payer}
                      {item.receipt ? " · Receipt" : ""}
                    </span>
                  </span>
                  <span className={styles.entryAmount}>
                    <strong>{money(item.amount)}</strong>
                    <span>Your share {money(item.share)}</span>
                  </span>
                  <span className={styles.paperFooter}>
                    <span>
                      {item.date} {item.year}
                    </span>
                    <span>
                      {item.receipt ? "Receipt attached" : "Added manually"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : items.length > 0 ? (
        <div className={styles.noResults}>
          <strong>No expenses found</strong>
          <p>Try another name or show everything.</p>
          <DesignButton variant="ghost" onClick={clearFilters}>
            Clear filters
          </DesignButton>
        </div>
      ) : (
        <div className={styles.empty}>
          <ExpenseEmptyArt playing={playing} />
          <EmptyHeading>No expenses yet.</EmptyHeading>
          <p>
            Add an expense or bring a receipt. We’ll help with everyone’s share.
          </p>
        </div>
      )}
    </div>
  );
}
