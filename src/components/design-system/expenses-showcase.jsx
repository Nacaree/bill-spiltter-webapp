"use client";

import { useId, useImperativeHandle, useRef, useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import { DialogPanel } from "./form-dialog";
import { BillEntryChoices } from "./bill-entry-choices";
import { billNavigationItems } from "./bill-navigation";
import { Coffee } from "./icons/animate-ui/coffee";
import { Route } from "./icons/animate-ui/route";
import { ReceiptText } from "./icons/receipt-text";
import {
  ExpenseSearch,
  ExpenseSearchIcon as SearchIcon,
} from "./expense-search";
import { ExpenseSearchShowcase } from "./expense-search-showcase";
import { ExpenseReceiptCard } from "./expense-receipt-card";
import { ExpenseReceiptShowcase } from "./expense-receipt-showcase";
import { ButtonStrokeShimmer } from "./button-stroke-shimmer";
import { sampleExpenses } from "./expense-preview-data";
import styles from "./expenses-showcase.module.css";

const directions = [
  {
    id: "daily",
    name: "Daily ledger",
    description: "Less at the top. More room for the moments below.",
    note: "A quiet, date-grouped list with daily totals and an understated add action.",
  },
  {
    id: "snapshot",
    name: "Spending snapshot",
    description: "See the bigger picture before the little details.",
    note: "A spending summary and category breakdown, followed by soft individual cards.",
  },
  {
    id: "journal",
    name: "Receipt journal",
    description: "A little collection of everything you shared.",
    note: "Paper-inspired entries, a compact running total and room for each payer.",
  },
  {
    id: "atelier",
    name: "Atelier",
    description: "An editorial ledger. Generous space. Beautifully quiet.",
    note: "An oversized total above roomy, paper-edged expense cards.",
    premium: true,
    emptyTitle: "Make room for a good time.",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    description: "A richer first impression, with every detail in its place.",
    note: "A layered purple summary, personal share and a single white ledger surface.",
    premium: true,
    emptyTitle: "The best part is sharing it.",
  },
  {
    id: "collection",
    name: "The Collection",
    description: "Little moments, collected with a little more care.",
    note: "A featured expense and a compact card grid. More visual, with clear totals throughout.",
    premium: true,
    emptyTitle: "Your next memory starts here.",
  },
];
const money = (amount) => formatMoney(amount, "USD");

function ExpenseConcept({
  direction,
  empty,
  searchDesign,
  receiptDesign,
  ref,
}) {
  const id = useId();
  const [expenses, setExpenses] = useState(empty ? [] : sampleExpenses);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const returnFocus = useRef(null);
  const addButton = useRef(null);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const personalShare = expenses.reduce((sum, item) => sum + item.share, 0);
  const isEditorial = direction.id === "atelier";
  const isAmethyst = direction.id === "amethyst";
  const isCollection = direction.id === "collection";
  const food = expenses
    .filter((item) => item.category === "Food & drinks")
    .reduce((sum, item) => sum + item.amount, 0);
  const visible = expenses.filter(
    (item) =>
      (filter !== "Paid by you" || item.payer === "Nary") &&
      (filter !== "Receipts" || item.receipt) &&
      `${item.name} ${item.payer} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const dates = [...new Set(visible.map((item) => item.date))];

  useImperativeHandle(
    ref,
    () => ({
      revealExpenses() {
        setQuery("");
        setFilter("All");
      },
    }),
    [],
  );

  function openAdd(event) {
    returnFocus.current = event.currentTarget;
    setAdding(true);
  }

  function addSample(action) {
    const receipt = action === "receipt";
    setExpenses((items) => [
      {
        id: crypto.randomUUID(),
        name: receipt ? "Market groceries" : "Late-night snacks",
        amount: receipt ? 2400 : 900,
        share: receipt ? 800 : 300,
        payer: "Nary",
        date: "30 OCT",
        category: "Food & drinks",
        receipt,
      },
      ...items,
    ]);
    setQuery("");
    setFilter("All");
    setNotice("Sample expense added. Reset the previews to start again.");
    setAdding(false);
  }

  function row(item) {
    if (isEditorial && receiptDesign !== "classic")
      return (
        <li key={item.id} className={styles.receiptItem}>
          <ExpenseReceiptCard
            expense={item}
            design={receiptDesign}
            onOpen={(expense, event) => {
              returnFocus.current = event.currentTarget;
              setDetail(expense);
              setDetailOpen(true);
            }}
          />
        </li>
      );
    const Icon = item.category === "Transport" ? Route : Coffee;
    return (
      <li key={item.id} className={styles.entry}>
        <button
          type="button"
          className={styles.entryButton}
          onClick={(event) => {
            returnFocus.current = event.currentTarget;
            setDetail(item);
            setDetailOpen(true);
          }}
        >
          <span className={styles.categoryIcon} aria-hidden="true">
            {isAmethyst ? (
              <span className={styles.payerInitial}>
                {item.payer.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <Icon size={20} animate={false} />
            )}
          </span>
          <span className={styles.entryCopy}>
            <strong>{item.name}</strong>
            <span>
              Paid by {item.payer}
              {direction.id !== "journal" && item.receipt ? " · Receipt" : ""}
            </span>
          </span>
          <span className={styles.entryAmount}>
            <strong>{money(item.amount)}</strong>
            <span>Your share {money(item.share)}</span>
          </span>
          {(direction.id === "journal" || isEditorial) && (
            <span className={styles.paperFooter}>
              <span>{item.date} 2026</span>
              <span>
                {item.receipt ? "Receipt attached" : "Added manually"}
              </span>
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <figure className={styles.option}>
      <figcaption className={styles.caption}>
        <span className={styles.optionNumber}>
          0{directions.indexOf(direction) + 1}
        </span>
        <h3>{direction.name}</h3>
        <p>{direction.description}</p>
      </figcaption>
      <section
        className={`${styles.phone} ${styles[direction.id]}`}
        aria-label={`${direction.name} expense preview`}
        data-expenses-preview={direction.id}
      >
        <div className={styles.appHeader}>
          <span className={styles.brand}>
            <BrandMark size={22} />
            Bill Splitter
          </span>
          <span className={styles.owner}>
            Nary <span aria-hidden="true">⌄</span>
          </span>
        </div>
        <div className={styles.pageBody}>
          <div className={styles.pageHeading}>
            <div className={styles.headingCopy}>
              <p className={styles.eyebrow}>WEEKEND DINNER</p>
              <h4>
                Expenses<span className={styles.headingDot}>.</span>
              </h4>
            </div>
            {!direction.premium && direction.id !== "snapshot" && (
              <DesignButton
                icon="plus"
                onClick={openAdd}
                aria-label="Add expense"
                className={styles.addCompact}
                ref={addButton}
              >
                {direction.id === "daily" ? "Add" : null}
              </DesignButton>
            )}
          </div>
          <p className={styles.subtitle}>
            {direction.id === "journal"
              ? "Good times. All accounted for."
              : "Every little cost, in one place."}
          </p>
          {direction.premium ? (
            <div className={styles.premiumSummary}>
              {isAmethyst && (
                <span className={styles.heroContours} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              )}
              <div className={styles.premiumKicker}>
                <span>
                  {isEditorial
                    ? "Total spent"
                    : isAmethyst
                      ? "A WEEKEND, WELL SHARED"
                      : "THE SHARED EDIT"}
                </span>
                {!isEditorial && (
                  <span>
                    {String(expenses.length).padStart(2, "0")}{" "}
                    {isCollection ? "moments" : "expenses"}
                  </span>
                )}
              </div>
              <div className={styles.premiumAmount}>
                <strong>
                  {isEditorial ? (
                    <AnimatedMoney amountMinor={total} />
                  ) : (
                    money(total)
                  )}
                </strong>
                <span>USD</span>
              </div>
              {isAmethyst ? (
                <div className={styles.personalSummary}>
                  <span>
                    Your share<strong>{money(personalShare)}</strong>
                  </span>
                  <span>
                    People sharing
                    <strong>
                      3 <small>together</small>
                    </strong>
                  </span>
                </div>
              ) : (
                <div className={styles.personalLine}>
                  {isEditorial ? (
                    <>
                      <span>
                        Your share <strong>{money(personalShare)}</strong>
                      </span>
                      <span>
                        {expenses.length}{" "}
                        {expenses.length === 1 ? "expense" : "expenses"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Your part of the good times</span>
                      <strong>{money(personalShare)}</strong>
                    </>
                  )}
                </div>
              )}
              {!isCollection && !isEditorial && (
                <DesignButton
                  ref={addButton}
                  icon="plus"
                  onClick={openAdd}
                  className={styles.premiumAdd}
                >
                  Add expense
                </DesignButton>
              )}
            </div>
          ) : direction.id === "snapshot" ? (
            <div className={styles.summary}>
              <div className={styles.summaryTop}>
                <span>Total spent</span>
                <span>{expenses.length} expenses · USD</span>
              </div>
              <strong className={styles.summaryAmount}>{money(total)}</strong>
              {total > 0 ? (
                <>
                  <div className={styles.breakdown} aria-hidden="true">
                    <span style={{ width: `${(food / total) * 100}%` }} />
                    <span />
                  </div>
                  <div className={styles.legend}>
                    <span>
                      <i />
                      Food & drinks <strong>{money(food)}</strong>
                    </span>
                    <span>
                      <i />
                      Transport <strong>{money(total - food)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <p className={styles.summaryHint}>
                  The first little cost starts the story.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.runningTotal}>
              <span>{expenses.length} expenses</span>
              <span>
                <strong>{money(total)}</strong> total
              </span>
            </div>
          )}
          {direction.id === "snapshot" && (
            <DesignButton
              icon="plus"
              onClick={openAdd}
              className={styles.addWide}
              ref={addButton}
            >
              Add expense
            </DesignButton>
          )}
          {isEditorial && (
            <div className={styles.atelierTools}>
              <DesignButton
                ref={addButton}
                icon="plus"
                onClick={openAdd}
                className={styles.stackAdd}
              >
                {(icon) => (
                  <>
                    <ButtonStrokeShimmer playing={!adding && !detailOpen} />
                    {icon}
                    <span>Add expense</span>
                  </>
                )}
              </DesignButton>
              {expenses.length > 0 && (
                <ExpenseSearch
                  id="atelier-expense-search"
                  design={searchDesign}
                  value={query}
                  onValueChange={setQuery}
                  filter={filter}
                  onFilterChange={setFilter}
                />
              )}
            </div>
          )}
          {expenses.length > 0 && !isEditorial && (
            <>
              <label className={styles.search} htmlFor={`${id}-search`}>
                <SearchIcon />
                <span className={styles.srOnly}>
                  Search {direction.name.toLowerCase()} expenses
                </span>
                <input
                  id={`${id}-search`}
                  type="search"
                  placeholder="Find an expense"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div
                className={styles.filters}
                role="group"
                aria-label="Filter expenses"
              >
                {["All", "Paid by you", "Receipts"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </>
          )}
          {visible.length > 0 ? (
            <div
              className={styles.ledger}
              id={isEditorial ? "atelier-expense-list" : undefined}
            >
              {direction.id === "daily" ? (
                dates.map((date) => (
                  <div key={date} className={styles.day}>
                    <div className={styles.dayHeading}>
                      <span>{date} 2026</span>
                      <span>
                        {money(
                          visible
                            .filter((item) => item.date === date)
                            .reduce((sum, item) => sum + item.amount, 0),
                        )}
                      </span>
                    </div>
                    <ul>
                      {visible.filter((item) => item.date === date).map(row)}
                    </ul>
                  </div>
                ))
              ) : (
                <>
                  <div className={styles.listHeading}>
                    {isEditorial ? (
                      <time dateTime="2026-10">OCTOBER 2026</time>
                    ) : (
                      <>
                        <span>
                          {query || filter !== "All"
                            ? `${visible.length} matching expenses`
                            : isCollection
                              ? "IN THE COLLECTION"
                              : isAmethyst
                                ? "THE DETAILS"
                                : "THE LITTLE DETAILS"}
                        </span>
                        <span>OCT 2026</span>
                      </>
                    )}
                  </div>
                  <ul>{visible.map(row)}</ul>
                </>
              )}
            </div>
          ) : expenses.length > 0 ? (
            <div className={styles.noResults}>
              <strong>No expenses found</strong>
              <p>Try another name or show everything.</p>
              <DesignButton
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setFilter("All");
                }}
              >
                Clear filters
              </DesignButton>
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyArt} aria-hidden="true">
                <ReceiptText size={36} animate={false} />
              </span>
              <h5>
                {direction.emptyTitle ??
                  (direction.id === "daily"
                    ? "Your first little cost"
                    : direction.id === "snapshot"
                      ? "Start small. Share fairly."
                      : "A story worth sharing")}
              </h5>
              <p>
                {direction.id === "journal"
                  ? "Dinner, the ride home, one more coffee. Keep the little things together."
                  : "Add an expense or bring a receipt. We’ll help with everyone’s share."}
              </p>
              <DesignButton
                variant={direction.id === "snapshot" ? "ghost" : "primary"}
                icon="plus"
                onClick={openAdd}
              >
                Add first expense
              </DesignButton>
            </div>
          )}
          {isCollection && (
            <DesignButton
              ref={addButton}
              icon="plus"
              onClick={openAdd}
              className={styles.collectionAdd}
            >
              Add expense
            </DesignButton>
          )}
        </div>
        <div className={styles.navigation} aria-hidden="true">
          {billNavigationItems.map(({ id: value, label, Icon }) => (
            <span
              key={value}
              className={value === "expenses" ? styles.selectedNav : undefined}
            >
              <span>
                <Icon size={20} animate={false} />
              </span>
              {label}
            </span>
          ))}
        </div>
      </section>
      <p className={styles.optionNote}>{direction.note}</p>
      <p className={styles.status} role="status">
        {notice}
      </p>
      <DialogPanel
        open={adding}
        onOpenChange={setAdding}
        title="Add to the bill"
        kind="options"
        description="Try a sample expense in this preview."
        closeLabel="Close expense choices"
        returnFocusRef={returnFocus}
        fallbackFocusRef={addButton}
      >
        <div className={styles.dialogBody}>
          <BillEntryChoices onSelect={addSample} receiptPlaying={adding} />
        </div>
      </DialogPanel>
      <DialogPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={detail?.name ?? "Expense details"}
        description="A closer look at this sample expense."
        closeLabel="Close expense details"
        returnFocusRef={returnFocus}
      >
        {detail && (
          <div className={styles.dialogBody}>
            <dl className={styles.details}>
              <div>
                <dt>Total</dt>
                <dd>{money(detail.amount)}</dd>
              </div>
              <div>
                <dt>Paid by</dt>
                <dd>{detail.payer}</dd>
              </div>
              <div>
                <dt>Your share</dt>
                <dd>{money(detail.share)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{detail.category}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{detail.receipt ? "Receipt" : "Manual entry"}</dd>
              </div>
            </dl>
          </div>
        )}
      </DialogPanel>
    </figure>
  );
}

export function ExpensesShowcase() {
  const [mode, setMode] = useState("populated");
  const [reset, setReset] = useState(0);
  const [searchDesign, setSearchDesign] = useState("tint");
  const [receiptDesign, setReceiptDesign] = useState("classic");
  const atelier = useRef(null);

  function previewReceipt(design) {
    setMode("populated");
    setReceiptDesign(design);
    atelier.current?.revealExpenses();
    requestAnimationFrame(() => {
      const receipt = document.querySelector("#atelier-expense-list button");
      receipt?.focus({ preventScroll: true });
      receipt?.scrollIntoView({ block: "center" });
    });
  }

  function previewSearch(design) {
    setMode("populated");
    setSearchDesign(design);
    requestAnimationFrame(() => {
      const search = document.getElementById("atelier-expense-search");
      search?.focus({ preventScroll: true });
      search?.scrollIntoView({ block: "center" });
    });
  }
  return (
    <div className={styles.showcase}>
      <div className={styles.toolbar}>
        <div>
          <p>Six ways to keep the little costs together.</p>
          <span>Comparison concepts · sample data only</span>
        </div>
        <div className={styles.previewControls}>
          <div
            role="group"
            aria-label="Expense preview state"
            className={styles.mode}
          >
            {["populated", "empty"].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === "populated" ? "With expenses" : "Empty bill"}
              </button>
            ))}
          </div>
          <DesignButton
            variant="ghost"
            icon="replay"
            onClick={() => setReset((value) => value + 1)}
          >
            Reset
          </DesignButton>
        </div>
      </div>
      <div id="expense-cards" className={styles.galleryHeading}>
        <span className={styles.premiumLabel}>THE PAPER DETAILS</span>
        <p>Four receipt card directions</p>
        <span>
          Compare the edges, spacing and detail layouts inside Atelier.
        </span>
      </div>
      <ExpenseReceiptShowcase
        activeDesign={receiptDesign}
        onPreview={previewReceipt}
      />
      <div id="expense-search" className={styles.galleryHeading}>
        <span className={styles.premiumLabel}>THE SEARCH DETAILS</span>
        <p>Four ways to find an expense</p>
        <span>
          Compare the search bars, then preview your favorite in Atelier.
        </span>
      </div>
      <ExpenseSearchShowcase
        key={reset}
        activeDesign={searchDesign}
        onPreview={previewSearch}
      />
      <div id="expenses-premium" className={styles.galleryHeading}>
        <span className={styles.premiumLabel}>A LITTLE MORE CONSIDERED</span>
        <p>Three premium directions</p>
        <span>
          More character in the layout. The same familiar foundations.
        </span>
      </div>
      <div className={styles.gallery}>
        {directions
          .filter((direction) => direction.premium)
          .map((direction) => (
            <ExpenseConcept
              ref={direction.id === "atelier" ? atelier : undefined}
              key={`${direction.id}-${mode}-${reset}`}
              direction={direction}
              empty={mode === "empty"}
              searchDesign={searchDesign}
              receiptDesign={receiptDesign}
            />
          ))}
      </div>
      <div className={styles.galleryHeading}>
        <span className={styles.premiumLabel}>THE FIRST EXPLORATIONS</span>
        <p>Three quieter starting points</p>
        <span>Keep the earlier directions close for comparison.</span>
      </div>
      <div className={styles.gallery}>
        {directions
          .filter((direction) => !direction.premium)
          .map((direction) => (
            <ExpenseConcept
              key={`${direction.id}-${mode}-${reset}`}
              direction={direction}
              empty={mode === "empty"}
            />
          ))}
      </div>
      <p className={styles.guidance}>
        Try searching, filtering or opening an expense. Add a sample through the
        shared drawer to compare how each empty state grows.
      </p>
    </div>
  );
}
