"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "motion/react";
import { DialogPanel } from "@/components/design-system/form-dialog";
import dialogStyles from "@/components/design-system/form-dialog.module.css";
import { ExpenseFormDialog } from "@/components/design-system/bill-form-dialogs";
import systemStyles from "@/components/design-system/system.module.css";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { ActivityTime } from "@/components/ui/activity-time";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { DesignShimmer } from "@/components/design-system/shimmer";
import { DesignBalanceGlow } from "@/components/design-system/balance-glow";
import { DesignBalanceContours } from "@/components/design-system/balance-contours";
import { useDesignReducedMotion } from "@/components/design-system/use-design-reduced-motion";
import {
  motionTiming,
  motionTransition,
} from "@/components/design-system/motion-tokens";
import { DesignCopyButton } from "@/components/design-system/copy-button";
import { Coffee } from "@/components/design-system/icons/animate-ui/coffee";
import { Route } from "@/components/design-system/icons/animate-ui/route";
import { ShoppingBag } from "@/components/design-system/icons/animate-ui/shopping-bag";
import { Tag } from "@/components/design-system/icons/animate-ui/tag";
import { FileText } from "@/components/design-system/icons/animate-ui/file-text";
import { Clock3 } from "@/components/design-system/icons/animate-ui/clock-3";
import { calculateBalances, suggestTransfers } from "@/lib/balances";
import { formatMoney, parseMoneyToMinor, splitEqually } from "@/lib/money";
import { refreshVisibleClock } from "@/lib/visible-clock";
import {
  createExampleActivity,
  exampleExpenses,
  examplePeople,
  exampleReceipt,
} from "./example-ledger";
import styles from "./mobile-bill.module.css";

const tabs = [
  ["overview", "Overview", "home"],
  ["expenses", "Expenses", "copy"],
  ["settle", "Settle", "wallet"],
];
const money = (value) => formatMoney(Math.abs(value), "USD");
function previewMinor(value) {
  try {
    return parseMoneyToMinor(value, "USD", { allowZero: true });
  } catch {
    return 0;
  }
}
const emptyDraft = {
  description: "",
  amount: "",
  paidBy: "nary",
  category: "Food & drinks",
  date: "2026-10-29",
  people: ["nary", "sokha", "mali"],
  method: "equal",
  exact: {},
  notes: "",
  editing: null,
};

function createExpenseDraft(people, paidBy = "nary") {
  return { ...emptyDraft, paidBy, people: people.map((person) => person.id) };
}

function createReceiptDraft(people) {
  return exampleReceipt.map((line) => ({
    ...line,
    people: people.map((person) => person.id),
  }));
}

function subscribeRoute(callback) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener("screen2:navigate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener("screen2:navigate", callback);
  };
}
function routeSnapshot() {
  return window.location.hash.slice(1) || "overview";
}
function serverRoute() {
  return "overview";
}

function BalanceCard({ children, balanceMinor }) {
  const card = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  const [shimmerRun, setShimmerRun] = useState(0);
  const [shimmerActive, setShimmerActive] = useState(false);

  useEffect(() => {
    if (reducedMotion !== false) return;
    let inView = false;
    let playing = false;
    let timer;
    function updatePlayback() {
      const next = inView && !document.hidden;
      if (next === playing) return;
      playing = next;
      clearInterval(timer);
      setShimmerActive(next);
      if (next) {
        setShimmerRun((run) => run + 1);
        // 1.8s of movement + 10.2s of rest: movement occupies 15% of the cycle.
        timer = setInterval(() => setShimmerRun((run) => run + 1), 12_000);
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        updatePlayback();
      },
      { threshold: 0.5 },
    );
    observer.observe(card.current);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      clearInterval(timer);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={card}
      className={styles.balanceCard}
      aria-label="Your balance"
      data-background-motion={
        reducedMotion === false && shimmerActive ? "running" : "paused"
      }
    >
      <DesignBalanceContours
        active={reducedMotion === false && shimmerActive}
      />
      <DesignBalanceGlow
        active={reducedMotion === false && shimmerActive}
        balanceMinor={balanceMinor}
      />
      <DesignShimmer
        active={reducedMotion === true || shimmerActive}
        run={shimmerRun}
      />
      {children}
    </section>
  );
}

function Avatar({ person, small = false }) {
  return (
    <span
      className={`${styles.avatar} ${styles[person?.tone ?? "purple"]} ${small ? styles.smallAvatar : ""}`}
      aria-hidden="true"
    >
      {person?.initials ?? "?"}
    </span>
  );
}

function ActivityCard({ entry, people }) {
  const actor = people.find((person) => person.id === entry.actorId);

  return (
    <li data-has-actor={actor ? true : undefined}>
      {actor && <Avatar person={actor} small />}
      <div className={styles.activityCopy}>
        {actor && (
          <strong className={styles.activityActor}>{actor.display_name}</strong>
        )}
        <p className={styles.activityMessage}>{entry.message}</p>
      </div>
      <ActivityTime createdAt={entry.createdAt} />
    </li>
  );
}

function Sheet({
  open,
  title,
  children,
  onDismiss,
  returnFocusRef,
  restoreFocus,
  kind,
}) {
  return (
    <DialogPanel
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      title={title}
      kind={kind}
      closeLabel="Close menu"
      className={styles.sheet}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (restoreFocus && returnFocusRef.current?.isConnected)
          returnFocusRef.current.focus({ preventScroll: true });
      }}
    >
      <div className={`${dialogStyles.body} ${dialogStyles.optionsBody}`}>
        {children}
      </div>
    </DialogPanel>
  );
}

function Field({ label, children, className = "", ...props }) {
  return (
    <label className={`${styles.field} ${className}`}>
      <span>{label}</span>
      {children ?? <input {...props} />}
    </label>
  );
}

function InlinePersonForm({
  expanded,
  onExpand,
  value,
  onValueChange,
  people,
  onSave,
}) {
  const id = useId();
  const input = useRef(null);
  const [error, setError] = useState("");
  const [addedName, setAddedName] = useState("");

  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);

  function submit(event) {
    event.preventDefault();
    const name = value.trim();
    const message = !name
      ? "Enter the person’s name."
      : people.some(
            (person) =>
              person.display_name.toLowerCase() === name.toLowerCase(),
          )
        ? "That person is already on the bill."
        : "";
    setError(message);
    if (!message) {
      onSave(name);
      setAddedName(name);
    }
    input.current?.focus();
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className={styles.inlinePersonForm}
      aria-label="Add a person"
      data-expanded={expanded}
    >
      <div className={styles.personComposer}>
        <div className={styles.personEntry}>
          <label htmlFor={`${id}-name`} className="sr-only">
            Person’s name
          </label>
          <input
            id={`${id}-name`}
            className={`${systemStyles.input} ${styles.personNameInput}`}
            placeholder="Person’s name"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
              setError("");
            }}
            ref={input}
            disabled={!expanded}
            aria-hidden={!expanded}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            maxLength={60}
            required
          />
          <Button
            type="button"
            icon="plus"
            className={styles.personReveal}
            onClick={onExpand}
            aria-expanded={expanded}
            aria-controls={`${id}-name`}
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : undefined}
          >
            Add person
          </Button>
        </div>
        <div className={styles.personSubmit} aria-hidden={!expanded}>
          <Button
            icon="plus"
            type="submit"
            aria-label="Add person"
            title="Add person"
            disabled={!expanded}
          />
        </div>
      </div>
      <div className={styles.personDetails} aria-hidden={!expanded}>
        <div>
          <p id={`${id}-hint`} className={styles.personHint}>
            They can claim their name when they open the shared bill link.
          </p>
          {error && (
            <p id={`${id}-error`} className={styles.personError} role="alert">
              {error}
            </p>
          )}
          <p className={styles.personStatus} role="status">
            {addedName
              ? `${addedName} added. Add another name or share the link.`
              : ""}
          </p>
        </div>
      </div>
    </form>
  );
}

function ExpenseRow({ expense, people, currentId, onOpen }) {
  const reducedMotion = useDesignReducedMotion();
  const [iconActive, setIconActive] = useState(false);
  const CategoryIcon =
    {
      "Food & drinks": Coffee,
      Transport: Route,
      Shopping: ShoppingBag,
    }[expense.category] ?? Tag;
  const payer = people.find(
    (person) => person.id === expense.paid_by_participant_id,
  );
  const share =
    expense.shares.find((row) => row.participantId === currentId)
      ?.amountMinor ?? 0;
  return (
    <button
      type="button"
      className={styles.expenseRow}
      onClick={onOpen}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIconActive(true);
      }}
      onPointerLeave={() => setIconActive(false)}
      onFocus={() => setIconActive(true)}
      onBlur={() => setIconActive(false)}
    >
      <span
        className={styles.categoryIcon}
        title={expense.category}
        data-category={expense.category}
        aria-hidden="true"
      >
        <CategoryIcon
          size={20}
          strokeWidth={1.6}
          animate={reducedMotion === false && iconActive}
        />
      </span>
      <span className={styles.expenseText}>
        <strong title={expense.description}>{expense.description}</strong>
        <small>
          Paid by {payer?.display_name}
          {expense.receipt ? " · Receipt" : ""}
        </small>
      </span>
      <span className={styles.expenseAmount}>
        <strong>{money(expense.amount_minor)}</strong>
        <small>Your share {money(share)}</small>
      </span>
    </button>
  );
}

export function MobileBill({ initialState = "populated", embedded = false }) {
  const reducedMotion = useDesignReducedMotion();
  const startsEmpty = initialState === "empty";
  const initialPeople = startsEmpty ? examplePeople.slice(0, 1) : examplePeople;
  const route = useSyncExternalStore(
    subscribeRoute,
    routeSnapshot,
    serverRoute,
  );
  const [routeView, routeOverlay] = route.split("/");
  // Keep existing bookmarked manual-entry links working with the shared drawer.
  const view = routeView === "new" ? "expenses" : routeView;
  const overlay = routeView === "new" ? "expense" : routeOverlay;
  const sheetOpen = Boolean(overlay) && overlay !== "expense";
  const [lastSheetOverlay, setLastSheetOverlay] = useState(overlay);
  if (sheetOpen && lastSheetOverlay !== overlay) setLastSheetOverlay(overlay);
  // Keep the outgoing panel's contents intact during its exit animation.
  const retainedOverlay = sheetOpen ? overlay : lastSheetOverlay;
  const sheetOverlay =
    retainedOverlay === "person" ? "people" : retainedOverlay;

  const [role, setRole] = useState("owner");
  const [settlerId, setSettlerId] = useState("sokha");
  const [people, setPeople] = useState(initialPeople);
  const [expenses, setExpenses] = useState(startsEmpty ? [] : exampleExpenses);
  const [settlements, setSettlements] = useState([]);
  const [activity, setActivity] = useState(() =>
    startsEmpty
      ? []
      : createExampleActivity(
          typeof window === "undefined" ? null : Date.now(),
        ),
  );
  const [draft, setDraft] = useState(() => createExpenseDraft(initialPeople));
  const [receiptLines, setReceiptLines] = useState(() =>
    createReceiptDraft(initialPeople),
  );
  const [receiptStage, setReceiptStage] = useState("choose");
  const [receiptFile, setReceiptFile] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [qrEnabled, setQrEnabled] = useState(!startsEmpty);
  const [qrImage, setQrImage] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [joinedName, setJoinedName] = useState("");
  const [deleted, setDeleted] = useState(false);
  const heading = useRef(null);
  const receiptInput = useRef(null);
  const expenseReturnFocus = useRef(null);
  const sheetReturnFocus = useRef(null);
  const previousView = useRef(null);
  const [previewHistory, setPreviewHistory] = useState([]);
  const settler =
    people.find((item) => item.id === settlerId) ??
    people.find((item) => !item.is_creator);
  const currentId = role === "owner" ? "nary" : (settler?.id ?? "nary");
  const person = people.find((item) => item.id === currentId) ?? people[0];
  const findPerson = (id) => people.find((item) => item.id === id);
  const balances = calculateBalances({
    participants: people,
    expenses,
    settlements,
  });
  const transfers = suggestTransfers(balances);
  const myBalance = balances.find((item) => item.id === currentId);
  const total = expenses.reduce((sum, item) => sum + item.amount_minor, 0);
  const hasLedger = expenses.length > 0 || settlements.length > 0;
  const activeTab =
    view === "overview" || view === "join"
      ? "overview"
      : view === "settle" || view.startsWith("pay-")
        ? "settle"
        : "expenses";
  const fullScreen = !tabs.some(([id]) => id === view) || deleted;
  const detail = view.startsWith("detail-")
    ? expenses.find((item) => item.id === view.slice(7))
    : null;
  const transfer = view.startsWith("pay-")
    ? transfers.find(
        (item) =>
          `pay-${item.fromParticipantId}-${item.toParticipantId}` === view,
      )
    : null;
  const isSender = transfer?.fromParticipantId === currentId;
  const titles = {
    overview: "Weekend dinner",
    expenses: "Expenses",
    settle: "Settle up",
    new: draft.editing ? "Edit expense" : "Add an expense",
    receipt:
      receiptStage === "choose" ? "Scan a receipt" : "Review your receipt",
    join: "Join the bill",
  };
  const title = deleted
    ? "This bill is closed"
    : (detail?.description ??
      (view.startsWith("pay-")
        ? isSender
          ? "Pay your share"
          : "Record a payment"
        : (titles[view] ?? "Weekend dinner")));

  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (overlay !== "expense") heading.current?.focus({ preventScroll: true });
  }, [view, overlay]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      "Bill Splitter screen2 payment preview. This is not a payment code.",
      { width: 264, margin: 1, color: { dark: "#30203e", light: "#ffffff" } },
    )
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function navigate(next, replace = false, trigger) {
    setError("");
    const nextOverlay = next.split("/")[1];
    if (nextOverlay && !overlay) {
      sheetReturnFocus.current = trigger ?? document.activeElement;
      if (nextOverlay === "add")
        expenseReturnFocus.current = trigger ?? document.activeElement;
    }
    if (embedded && !replace)
      setPreviewHistory((current) => [...current, route]);
    const state = {
      ...window.history.state,
      screen2From: replace ? window.history.state?.screen2From : route,
    };
    window.history[embedded || replace ? "replaceState" : "pushState"](
      state,
      "",
      `#${next}`,
    );
    window.dispatchEvent(new Event("screen2:navigate"));
  }

  function back(fallback = activeTab) {
    setError("");
    if (embedded) {
      const previous = previewHistory.at(-1) ?? fallback;
      setPreviewHistory((current) => current.slice(0, -1));
      navigate(previous, true);
    } else if (window.history.state?.screen2From) window.history.back();
    else navigate(fallback, true);
  }

  function changeRole(next) {
    setRole(next);
    if (fullScreen) navigate(activeTab, true);
  }

  function updateDraft(changes) {
    setDraft((current) => ({ ...current, ...changes }));
  }
  function openManual() {
    if (!draft.description && !draft.editing)
      updateDraft({ paidBy: currentId });
    navigate(`${view}/expense`, true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/screen2?preview=${initialState}#overview`,
      );
      return true;
    } catch {
      setError(
        "Couldn’t copy the link. You can copy it from your browser’s address bar.",
      );
      return false;
    }
  }

  function addActivity(message, actorId = person.id) {
    const createdAt = new Date().toISOString();
    setActivity((current) =>
      [{ actorId, message, createdAt }, ...current].slice(0, 8),
    );
    refreshVisibleClock();
  }

  function saveExpense({ amountMinor, shares }) {
    const expense = {
      id: draft.editing ?? `expense_${crypto.randomUUID()}`,
      description: draft.description.trim(),
      amount_minor: amountMinor,
      paid_by_participant_id: draft.paidBy,
      category: draft.category,
      date: draft.date,
      shares,
      notes: draft.notes,
    };
    setExpenses((current) =>
      draft.editing
        ? current.map((item) => (item.id === draft.editing ? expense : item))
        : [expense, ...current],
    );
    addActivity(
      `${draft.editing ? "Updated" : "Added"} ${expense.description}`,
    );
    setNotice(
      draft.editing
        ? "Expense updated. Balances are up to date."
        : "Expense added. Everyone’s balance is up to date.",
    );
    setDraft(createExpenseDraft(people, currentId));
    navigate("expenses", true);
  }

  function editExpense(event) {
    expenseReturnFocus.current = event.currentTarget;
    setDraft({
      description: detail.description,
      amount: (detail.amount_minor / 100).toFixed(2),
      paidBy: detail.paid_by_participant_id,
      category: detail.category,
      date: detail.date,
      people: detail.shares.map((row) => row.participantId),
      method: "exact",
      exact: Object.fromEntries(
        detail.shares.map((row) => [
          row.participantId,
          (row.amountMinor / 100).toFixed(2),
        ]),
      ),
      notes: detail.notes ?? "",
      editing: detail.id,
    });
    navigate(`${view}/expense`);
  }

  function confirmReceipt(event) {
    event.preventDefault();
    try {
      const parts = receiptLines.map((line) => {
        if (!line.name.trim())
          throw new Error("Give every receipt item a name.");
        return { ...line, minor: parseMoneyToMinor(line.amount, "USD") };
      });
      const shares = new Map();
      for (const line of parts) {
        if (!line.people.length)
          throw new Error(`Choose who shared ${line.name}.`);
        for (const share of splitEqually(line.minor, line.people))
          shares.set(
            share.participantId,
            (shares.get(share.participantId) ?? 0) + share.amountMinor,
          );
      }
      const amount = parts.reduce((sum, line) => sum + line.minor, 0);
      setExpenses((current) => [
        {
          id: `receipt_${Date.now()}`,
          description: "Lunch at Malis",
          amount_minor: amount,
          paid_by_participant_id: currentId,
          category: "Food & drinks",
          date: "2026-10-29",
          receipt: true,
          receiptLines: parts,
          shares: [...shares].map(([participantId, amountMinor]) => ({
            participantId,
            amountMinor,
          })),
        },
        ...current,
      ]);
      addActivity("Added Lunch at Malis from a receipt");
      setReceiptStage("choose");
      setReceiptLines(createReceiptDraft(people));
      setNotice(
        "Receipt added. The confirmed items now count toward balances.",
      );
      navigate("expenses", true);
    } catch (problem) {
      setError(problem.message);
    }
  }

  function openPayment(item) {
    setPayAmount((item.amountMinor / 100).toFixed(2));
    setPaymentNote("");
    navigate(`pay-${item.fromParticipantId}-${item.toParticipantId}`);
  }

  function recordPayment(event) {
    event.preventDefault();
    try {
      const amount = parseMoneyToMinor(payAmount, "USD");
      if (!transfer || amount > transfer.amountMinor)
        throw new Error(
          "Enter an amount no greater than the outstanding balance.",
        );
      setSettlements((current) => [
        {
          id: `payment_${Date.now()}`,
          from_participant_id: transfer.fromParticipantId,
          to_participant_id: transfer.toParticipantId,
          amount_minor: amount,
          note: paymentNote,
        },
        ...current,
      ]);
      addActivity(
        `Paid ${findPerson(transfer.toParticipantId).display_name} ${money(amount)}`,
        transfer.fromParticipantId,
      );
      setNotice("Payment recorded. Everyone’s balance has been updated.");
      navigate("settle", true);
    } catch (problem) {
      setError(problem.message);
    }
  }

  function addPerson(name) {
    setPeople((current) => [
      ...current,
      {
        id: `person_${crypto.randomUUID()}`,
        display_name: name,
        initials: name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        tone: "purple",
        waiting: true,
      },
    ]);
    setNewPerson("");
    addActivity(`Added ${name} to the bill`);
    setNotice(`${name} can claim their name from the shared link.`);
  }

  function reset() {
    setPreviewHistory([]);
    setPeople(initialPeople);
    setExpenses(startsEmpty ? [] : exampleExpenses);
    setSettlements([]);
    setDraft(createExpenseDraft(initialPeople));
    setReceiptLines(createReceiptDraft(initialPeople));
    setReceiptStage("choose");
    setReceiptFile("");
    setRole("owner");
    setSettlerId("sokha");
    setDeleted(false);
    setQrEnabled(!startsEmpty);
    setActivity(startsEmpty ? [] : createExampleActivity(new Date().getTime()));
    refreshVisibleClock();
    setNotice("");
    setPayAmount("");
    setPaymentNote("");
    setNewPerson("");
    setAddingPerson(false);
    setJoinedName("");
    setQuery("");
    setFilter("All");
    navigate("overview", true);
  }

  const visibleExpenses = expenses.filter(
    (item) =>
      (filter === "All" ||
        (filter === "Receipts"
          ? item.receipt
          : item.shares.some((share) => share.participantId === currentId))) &&
      item.description.toLowerCase().includes(query.toLowerCase()),
  );
  const personalTransfers = transfers.filter(
    (item) =>
      item.fromParticipantId === currentId ||
      item.toParticipantId === currentId,
  );
  const receiptTotal = receiptLines.reduce(
    (sum, line) => sum + previewMinor(line.amount),
    0,
  );
  const dismiss = () => back(view);

  return (
    <div className={styles.page}>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <BrandMark size={29} />
            <span>Bill Splitter</span>
          </div>
          <div className={styles.headerTools}>
            <label className={styles.perspective}>
              <span className="sr-only">View as</span>
              <select
                value={role}
                onChange={(event) => changeRole(event.target.value)}
                aria-label="View as"
              >
                <option value="owner">Owner · Nary</option>
                {settler ? (
                  <option value="settler">
                    Settler · {settler.display_name}
                  </option>
                ) : null}
              </select>
            </label>
            <Button
              icon="menu"
              variant="ghost"
              className={styles.iconButton}
              aria-label="Bill menu"
              onClick={(event) =>
                navigate(`${view}/menu`, false, event.currentTarget)
              }
            />
          </div>
        </header>

        <div className={styles.content}>
          {fullScreen && !deleted ? (
            <button
              type="button"
              className={styles.backLink}
              onClick={() => back(activeTab)}
            >
              <span aria-hidden="true">←</span> Back to {activeTab}
            </button>
          ) : null}
          <div className={styles.pageTitle}>
            <p className={styles.eyebrow}>
              {view === "overview"
                ? "A little shared, a little simpler"
                : "Weekend dinner"}
            </p>
            <div className={styles.titleRow}>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              {view === "overview" && !deleted ? (
                <DesignCopyButton
                  onCopy={copyLink}
                  className={styles.shareButton}
                >
                  Share bill
                </DesignCopyButton>
              ) : null}
            </div>
          </div>

          {deleted ? (
            <section className={styles.empty}>
              <span className={styles.successMark}>✓</span>
              <h2>All done here.</h2>
              <p>This bill is no longer available to the group.</p>
              <Button onClick={reset}>Restore example bill</Button>
            </section>
          ) : view === "overview" ? (
            <>
              <p className={styles.subtitle}>
                {hasLedger
                  ? "Good food. Great company. Fair shares."
                  : "Your bill is ready. Start sharing."}
              </p>
              <BalanceCard balanceMinor={myBalance.netMinor}>
                <div className={styles.balanceTop}>
                  <span className={styles.balanceLabel}>
                    {!hasLedger
                      ? "Ready when you are"
                      : myBalance.netMinor > 0
                        ? "You’re owed"
                        : myBalance.netMinor < 0
                          ? "You owe"
                          : "All settled"}
                  </span>
                  <span>USD</span>
                </div>
                <strong className={styles.balanceNumber}>
                  <AnimatedMoney amountMinor={Math.abs(myBalance.netMinor)} />
                </strong>
                <div className={styles.balanceCaption}>
                  {!hasLedger
                    ? "Add an expense to start sharing costs"
                    : myBalance.netMinor > 0
                      ? `From ${personalTransfers.filter((item) => item.toParticipantId === currentId).length} ${personalTransfers.length === 1 ? "person" : "people"} in this bill`
                      : myBalance.netMinor < 0
                        ? "Your share, after what you’ve already paid"
                        : "You’re up to date with the group"}
                </div>
                <Button
                  icon={
                    !hasLedger
                      ? "plus"
                      : myBalance.netMinor === 0
                        ? "check"
                        : "arrow"
                  }
                  iconPosition="end"
                  className={styles.balanceAction}
                  onClick={(event) =>
                    navigate(
                      hasLedger ? "settle" : "overview/add",
                      false,
                      event.currentTarget,
                    )
                  }
                >
                  {!hasLedger
                    ? "Add your first expense"
                    : myBalance.netMinor > 0
                      ? "See who owes you"
                      : myBalance.netMinor < 0
                        ? "Settle your share"
                        : "View balances"}
                </Button>
              </BalanceCard>
              <div className={styles.stats}>
                <div>
                  <span>Total spent</span>
                  <strong>{money(total)}</strong>
                </div>
                <div>
                  <span>Your share</span>
                  <strong>{money(myBalance.shareMinor)}</strong>
                </div>
                <div>
                  <span>Expenses</span>
                  <strong>{expenses.length}</strong>
                </div>
              </div>
              <Button
                className={styles.peopleSummary}
                type="button"
                variant="secondary"
                icon="arrow"
                iconPosition="end"
                onClick={(event) =>
                  navigate("overview/people", false, event.currentTarget)
                }
              >
                <span className={styles.avatarStack}>
                  {people.slice(0, 3).map((item) => (
                    <Avatar key={item.id} person={item} small />
                  ))}
                </span>
                <span>
                  <strong>
                    {people.length === 1
                      ? "Just you, for now"
                      : `${people.length} people, one bill`}
                  </strong>
                  <small>
                    {people.length === 1
                      ? "Add names or share an invitation link"
                      : people.some((item) => item.waiting)
                        ? "Someone is waiting to join"
                        : "Everyone’s here"}
                  </small>
                </span>
              </Button>
              <div className={styles.sectionHeading}>
                <h2>Recent expenses</h2>
                {expenses.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    icon="arrow"
                    iconPosition="end"
                    onClick={() => navigate("expenses")}
                  >
                    See all
                  </Button>
                ) : null}
              </div>
              {expenses.length > 0 ? (
                <div className={styles.expenseList}>
                  {expenses.slice(0, 2).map((item) => (
                    <ExpenseRow
                      key={item.id}
                      expense={item}
                      people={people}
                      currentId={currentId}
                      onOpen={() => navigate(`detail-${item.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <section
                  className={styles.receiptEmpty}
                  aria-labelledby="screen2-empty-expenses-title"
                >
                  <div
                    className={styles.receiptIllustration}
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.receiptPaper} ${styles.receiptPaperBack}`}
                    />
                    <span className={styles.receiptPaper}>
                      <FileText size={20} strokeWidth={1.5} animate={false} />
                      <span className={styles.receiptRule} />
                      <span className={styles.receiptRule} />
                      <span className={styles.receiptRule} />
                    </span>
                  </div>
                  <h3 id="screen2-empty-expenses-title">
                    A little receipt.
                    <br />A lot less math.
                  </h3>
                  <p>
                    Add your first expense.
                    <br />
                    We’ll help with the split.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    icon="arrow"
                    iconPosition="end"
                    className={styles.emptyExpenseAction}
                    onClick={(event) =>
                      navigate("overview/add", false, event.currentTarget)
                    }
                  >
                    Add expense
                  </Button>
                </section>
              )}
              <section
                className={styles.activitySection}
                aria-labelledby="screen2-activity-heading"
              >
                <div className={styles.sectionHeading}>
                  <h2 id="screen2-activity-heading">Recent activity</h2>
                </div>
                {activity.length > 0 ? (
                  <ul className={styles.activity}>
                    {activity.slice(0, 3).map((item, index) => (
                      <ActivityCard
                        key={`${item.actorId}-${item.message}-${index}`}
                        entry={item}
                        people={people}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyActivity}>
                    <span aria-hidden="true">
                      <Clock3 size={16} animate={false} />
                    </span>
                    The little updates will live here.
                  </p>
                )}
              </section>
            </>
          ) : view === "expenses" ? (
            <>
              <p className={styles.subtitle}>
                Every little cost, in one place.
              </p>
              <div className={styles.expenseSummary}>
                <span>{expenses.length} expenses</span>
                <strong>
                  {money(total)} <small>total</small>
                </strong>
              </div>
              <Button
                icon="plus"
                className={styles.fullButton}
                onClick={(event) =>
                  navigate("expenses/add", false, event.currentTarget)
                }
              >
                Add expense
              </Button>
              <label className={styles.search}>
                <span className="sr-only">Search expenses</span>
                <input
                  type="search"
                  placeholder="Search expenses"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div
                className={styles.filters}
                role="group"
                aria-label="Filter expenses"
              >
                {["All", "Your expenses", "Receipts"].map((item) => (
                  <button
                    key={item}
                    aria-pressed={filter === item}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {visibleExpenses.length ? (
                <>
                  <p className={styles.listDate}>OCTOBER 2026</p>
                  <div className={styles.expenseList}>
                    {visibleExpenses.map((item) => (
                      <ExpenseRow
                        key={item.id}
                        expense={item}
                        people={people}
                        currentId={currentId}
                        onOpen={() => navigate(`detail-${item.id}`)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <h2>
                    {expenses.length ? "No matching expenses" : "A fresh start"}
                  </h2>
                  <p>
                    {expenses.length
                      ? "Try another search or filter."
                      : "Add an expense or scan a receipt to start sharing costs."}
                  </p>
                  {expenses.length ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery("");
                        setFilter("All");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          ) : view === "settle" ? (
            <>
              <p className={styles.subtitle}>Clear balances. Happy friends.</p>
              <section className={styles.settleSummary}>
                <span className={styles.settleSymbol} aria-hidden="true">
                  {myBalance.netMinor === 0 ? "✓" : "↗"}
                </span>
                <span>
                  <small>
                    {myBalance.netMinor > 0
                      ? "Still coming your way"
                      : myBalance.netMinor < 0
                        ? "Your remaining balance"
                        : "You’re all settled"}
                  </small>
                  <strong>{money(myBalance.netMinor)}</strong>
                </span>
              </section>
              <div className={styles.sectionHeading}>
                <h2>
                  {myBalance.netMinor > 0
                    ? "Payments to collect"
                    : "Your next step"}
                </h2>
                <span className={styles.tinyLabel}>
                  {personalTransfers.length} remaining
                </span>
              </div>
              {personalTransfers.length ? (
                personalTransfers.map((item) => (
                  <article
                    key={`${item.fromParticipantId}-${item.toParticipantId}`}
                    className={styles.transferCard}
                  >
                    <div className={styles.transferTop}>
                      <Avatar
                        person={findPerson(
                          item.fromParticipantId === currentId
                            ? item.toParticipantId
                            : item.fromParticipantId,
                        )}
                      />
                      <span>
                        <strong>
                          {findPerson(item.fromParticipantId).display_name}{" "}
                          <span className={styles.transferArrow}>→</span>{" "}
                          {findPerson(item.toParticipantId).display_name}
                        </strong>
                        <small>
                          {item.fromParticipantId === currentId
                            ? "You pay"
                            : "You receive"}
                        </small>
                      </span>
                      <strong>{money(item.amountMinor)}</strong>
                    </div>
                    <Button
                      icon={
                        item.fromParticipantId === currentId ? "arrow" : "check"
                      }
                      variant={
                        item.fromParticipantId === currentId
                          ? "primary"
                          : "secondary"
                      }
                      className={styles.fullButton}
                      onClick={() => openPayment(item)}
                    >
                      {item.fromParticipantId === currentId
                        ? `Pay ${findPerson(item.toParticipantId).display_name}`
                        : "Record received payment"}
                    </Button>
                  </article>
                ))
              ) : (
                <div className={styles.emptyCompact}>
                  <span>✓</span>
                  <p>
                    All square with the group.
                    <small>
                      New expenses will appear here when there’s something to
                      settle.
                    </small>
                  </p>
                </div>
              )}
              {role === "owner" ? (
                <button
                  type="button"
                  className={styles.qrSettings}
                  onClick={(event) =>
                    navigate("settle/qr", false, event.currentTarget)
                  }
                >
                  <span className={styles.qrMini} aria-hidden="true">
                    ▦
                  </span>
                  <span>
                    <strong>Your payment QR</strong>
                    <small>
                      {qrEnabled
                        ? "Nary Chan · USD · Ready to receive"
                        : "Add a QR to make settling easier"}
                    </small>
                  </span>
                  <span className={styles.chevron} aria-hidden="true">
                    ›
                  </span>
                </button>
              ) : null}
              <details className={styles.groupBalances}>
                <summary>
                  Everyone’s balance <span aria-hidden="true">⌄</span>
                </summary>
                <ul>
                  {balances.map((item) => (
                    <li key={item.id}>
                      <span>{item.display_name}</span>
                      <strong
                        className={item.netMinor > 0 ? styles.positive : ""}
                      >
                        {item.netMinor === 0
                          ? "Settled"
                          : `${money(item.netMinor)} ${item.netMinor > 0 ? "to receive" : "to pay"}`}
                      </strong>
                    </li>
                  ))}
                </ul>
              </details>
              <div className={styles.sectionHeading}>
                <h2>Payment history</h2>
              </div>
              {settlements.length ? (
                <ul className={styles.paymentHistory}>
                  {settlements.map((item) => (
                    <li key={item.id}>
                      <span className={styles.paymentCheck}>✓</span>
                      <span>
                        <strong>
                          {findPerson(item.from_participant_id).display_name}{" "}
                          paid {findPerson(item.to_participant_id).display_name}
                        </strong>
                        <small>{item.note || "Payment recorded today"}</small>
                      </span>
                      <strong>{money(item.amount_minor)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.quietEmpty}>
                  Recorded payments will show up here.
                </p>
              )}
            </>
          ) : view === "receipt" ? (
            receiptStage === "choose" ? (
              <section className={styles.receiptUpload}>
                <div className={styles.paperReceipt} aria-hidden="true">
                  <span>MALIS</span>
                  <small>PHNOM PENH</small>
                  <i />
                  <p>
                    <span>Fish amok</span>
                    <b>22.00</b>
                  </p>
                  <p>
                    <span>Morning glory</span>
                    <b>8.00</b>
                  </p>
                  <p>
                    <span>Iced tea</span>
                    <b>9.00</b>
                  </p>
                  <i />
                  <p>
                    <strong>TOTAL</strong>
                    <strong>$39.00</strong>
                  </p>
                  <small>THANK YOU FOR DINING WITH US</small>
                </div>
                <h2>One receipt. Less typing.</h2>
                <p>
                  Choose an image, check the items, and decide who shared what.
                </p>
                <Button
                  icon="upload"
                  type="button"
                  className={styles.fullButton}
                  onClick={() => receiptInput.current?.click()}
                >
                  Choose receipt image
                </Button>
                <input
                  ref={receiptInput}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setReceiptFile(file.name);
                  }}
                />
                {receiptFile ? (
                  <p className={styles.fileName}>{receiptFile}</p>
                ) : null}
                <Button
                  icon="upload"
                  variant="secondary"
                  className={styles.fullButton}
                  onClick={() => setReceiptStage("review")}
                >
                  {receiptFile
                    ? "Preview with example items"
                    : "Try an example receipt"}
                </Button>
                <small>JPG, PNG or HEIC · up to 10 MB</small>
              </section>
            ) : (
              <form
                id="screen2-receipt-form"
                className={styles.form}
                onSubmit={confirmReceipt}
              >
                <p className={styles.subtitle}>
                  Check each item before it joins the bill.
                </p>
                <div className={styles.receiptHeading}>
                  <span className={styles.categoryIcon} aria-hidden="true">
                    <Coffee size={20} strokeWidth={1.6} />
                  </span>
                  <span>
                    <strong>Malis Phnom Penh</strong>
                    <small>29 Oct 2026 · Paid by {person.display_name}</small>
                  </span>
                  <span className={styles.reviewBadge}>Review</span>
                </div>
                {receiptLines.map((line, index) => (
                  <article key={line.id} className={styles.receiptLine}>
                    <div className={styles.receiptLineFields}>
                      <Field
                        label={`Item ${index + 1}`}
                        value={line.name}
                        onChange={(event) =>
                          setReceiptLines((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                      />
                      <Field
                        label="USD"
                        inputMode="decimal"
                        value={line.amount}
                        onChange={(event) =>
                          setReceiptLines((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? { ...item, amount: event.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                      />
                    </div>
                    <details>
                      <summary>
                        Split with{" "}
                        {line.people.length === people.length
                          ? "everyone"
                          : `${line.people.length} people`}{" "}
                        <span aria-hidden="true">⌄</span>
                      </summary>
                      <div className={styles.receiptPeople}>
                        {people.map((item) => (
                          <label key={item.id}>
                            <input
                              type="checkbox"
                              checked={line.people.includes(item.id)}
                              onChange={() =>
                                setReceiptLines((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          people: entry.people.includes(item.id)
                                            ? entry.people.filter(
                                                (id) => id !== item.id,
                                              )
                                            : [...entry.people, item.id],
                                        }
                                      : entry,
                                  ),
                                )
                              }
                            />
                            {item.display_name}
                          </label>
                        ))}
                      </div>
                    </details>
                  </article>
                ))}
                <div className={styles.receiptTotal}>
                  <span>Receipt total</span>
                  <strong>
                    {money(
                      Number.isSafeInteger(receiptTotal) ? receiptTotal : 0,
                    )}
                  </strong>
                </div>
                <p className={styles.splitHint}>
                  Your balance updates only after you confirm.
                </p>
              </form>
            )
          ) : detail ? (
            <>
              <div className={styles.detailAmount}>
                {money(detail.amount_minor)}
              </div>
              <div className={styles.detailMeta}>
                <span>
                  Paid by{" "}
                  <strong>
                    {findPerson(detail.paid_by_participant_id)?.display_name}
                  </strong>
                </span>
                <span>
                  {detail.date} · {detail.category}
                </span>
              </div>
              <section className={styles.detailPanel}>
                <h2>Who shared this</h2>
                <ul className={styles.shareBreakdown}>
                  {detail.shares.map((item) => (
                    <li key={item.participantId}>
                      <Avatar person={findPerson(item.participantId)} small />
                      <span>
                        {findPerson(item.participantId)?.display_name}
                        {item.participantId === currentId ? " (you)" : ""}
                      </span>
                      <strong>{money(item.amountMinor)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
              {detail.receipt ? (
                <section className={styles.receiptNote}>
                  <span>≋</span>
                  <p>
                    <strong>Added from a receipt</strong>
                    <small>
                      The confirmed items are included in this expense.
                    </small>
                  </p>
                </section>
              ) : null}
              {detail.notes ? (
                <p className={styles.detailNotes}>{detail.notes}</p>
              ) : null}
              <Button
                icon="plus"
                variant="secondary"
                className={styles.fullButton}
                onClick={editExpense}
              >
                Edit expense
              </Button>
              <Button
                variant="ghost"
                className={styles.removeButton}
                onClick={(event) =>
                  navigate(`${view}/remove`, false, event.currentTarget)
                }
              >
                Remove expense
              </Button>
            </>
          ) : transfer ? (
            <form
              id="screen2-payment-form"
              className={styles.form}
              onSubmit={recordPayment}
            >
              <div className={styles.payTo}>
                <Avatar
                  person={findPerson(
                    isSender
                      ? transfer.toParticipantId
                      : transfer.fromParticipantId,
                  )}
                />
                <span>
                  {isSender ? "Pay to" : "Received from"}
                  <strong>
                    {
                      findPerson(
                        isSender
                          ? transfer.toParticipantId
                          : transfer.fromParticipantId,
                      )?.display_name
                    }
                  </strong>
                </span>
              </div>
              <Field label="Amount · USD" className={styles.paymentAmount}>
                <input
                  aria-label="Payment amount"
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value)}
                  required
                />
              </Field>
              {isSender && transfer.toParticipantId === "nary" && qrEnabled ? (
                <div className={styles.paymentQr}>
                  {qrImage ? (
                    <Image
                      unoptimized
                      src={qrImage}
                      alt="Sample payment QR preview"
                      width={208}
                      height={208}
                    />
                  ) : null}
                  <strong>NARY CHAN</strong>
                  <span>ABA · USD</span>
                  <small>QR preview</small>
                </div>
              ) : null}
              <p className={styles.paymentHelp}>
                {isSender
                  ? "After paying in your banking app or by cash, record the payment here."
                  : "Record the amount you’ve received to update the shared balance."}
              </p>
              <Field
                label="Note (optional)"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="e.g. Paid by ABA transfer"
              />
            </form>
          ) : view === "join" ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                const name = joinedName.trim();
                const existing = people.find(
                  (item) =>
                    item.display_name.toLowerCase() === name.toLowerCase(),
                );
                if (!name) return;
                if (existing?.is_creator) {
                  setError("Choose your own name to join this bill.");
                  return;
                }
                const id = existing?.id ?? `person_${Date.now()}`;
                if (!existing)
                  setPeople((current) => [
                    ...current,
                    {
                      id,
                      display_name: name,
                      initials: name.slice(0, 2).toUpperCase(),
                      tone: "peach",
                    },
                  ]);
                setSettlerId(id);
                setRole("settler");
                setNotice(`You’re now joining as ${name}.`);
                navigate("overview", true);
              }}
            >
              <p className={styles.subtitle}>
                You’re invited to Weekend dinner. Pick your name to join in.
              </p>
              <Field
                label="Your name"
                list="screen2-join-names"
                value={joinedName}
                onChange={(event) => setJoinedName(event.target.value)}
                placeholder="Sokha"
                required
              />
              <datalist id="screen2-join-names">
                {people
                  .filter((item) => !item.is_creator)
                  .map((item) => (
                    <option key={item.id} value={item.display_name} />
                  ))}
              </datalist>
              <Button type="submit" className={styles.fullButton}>
                Join this bill
              </Button>
              <p className={styles.splitHint}>
                Already listed? Use that name. New here? Enter your name
                instead.
              </p>
            </form>
          ) : (
            <section className={styles.empty}>
              <h2>You’re up to date.</h2>
              <Button onClick={() => navigate("overview", true)}>
                Back to overview
              </Button>
            </section>
          )}

          {error && !overlay ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {!fullScreen ? (
          <nav className={styles.bottomNav} aria-label="Bill sections">
            {tabs.map(([id, label, icon]) => (
              <Button
                key={id}
                icon={icon}
                variant="ghost"
                className={styles.tabButton}
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                {label}
              </Button>
            ))}
          </nav>
        ) : (view === "receipt" && receiptStage === "review") || transfer ? (
          <div className={styles.actionBar}>
            <Button
              icon="check"
              type="submit"
              form={
                view === "receipt"
                  ? "screen2-receipt-form"
                  : "screen2-payment-form"
              }
              className={styles.fullButton}
            >
              {view === "receipt"
                ? "Confirm & add expense"
                : isSender
                  ? "I’ve paid — record payment"
                  : "Record received payment"}
            </Button>
          </div>
        ) : null}
        <div
          className={`${styles.notice} ${notice ? styles.noticeVisible : ""}`}
          role="status"
          aria-live="polite"
        >
          {notice ? (
            <>
              <span aria-hidden="true">✓</span>
              {notice}
            </>
          ) : null}
        </div>

        <ExpenseFormDialog
          open={overlay === "expense"}
          onOpenChange={(open) => {
            if (!open) dismiss();
          }}
          value={draft}
          onValueChange={updateDraft}
          people={people}
          onSave={saveExpense}
          allowExact
          categoryOptions={["Food & drinks", "Transport", "Shopping", "Other"]}
          title={draft.editing ? "Edit expense" : "Add an expense"}
          submitLabel={draft.editing ? "Save changes" : "Add expense"}
          submitIcon={draft.editing ? "check" : "plus"}
          returnFocusRef={expenseReturnFocus}
          fallbackFocusRef={heading}
          closeLabel="Close expense form"
        />
        <Sheet
          open={sheetOpen}
          kind={
            sheetOverlay === "remove" || sheetOverlay === "delete"
              ? "confirm"
              : "options"
          }
          returnFocusRef={sheetReturnFocus}
          restoreFocus={overlay !== "expense"}
          title={
            {
              add: "Add to the bill",
              menu: "Bill menu",
              people: "The people at your table",
              qr: "Your payment QR",
              remove: "Remove this expense?",
              delete: "Delete this bill?",
            }[sheetOverlay] ?? "Bill options"
          }
          onDismiss={dismiss}
        >
          {sheetOverlay === "add" ? (
            <>
              <p className={styles.sheetDescription}>
                Choose what’s easiest. We’ll handle the math.
              </p>
              <Button
                icon="upload"
                variant="secondary"
                className={styles.addOption}
                onClick={() => {
                  setReceiptStage("choose");
                  navigate("receipt", true);
                }}
              >
                <span>
                  <strong>Scan a receipt</strong>
                  <small>Review the items, then split them</small>
                </span>
                <span className={styles.chevron}>›</span>
              </Button>
              <Button
                icon="plus"
                variant="secondary"
                className={styles.addOption}
                onClick={openManual}
              >
                <span>
                  <strong>Enter manually</strong>
                  <small>For anything without a receipt</small>
                </span>
                <span className={styles.chevron}>›</span>
              </Button>
            </>
          ) : null}
          {sheetOverlay === "menu" ? (
            <>
              <div className={styles.menuIdentity}>
                <Avatar person={person} />
                <span>
                  <strong>{person.display_name}</strong>
                  <small>
                    {role === "owner" ? "Bill owner" : "Joined participant"}
                  </small>
                </span>
              </div>
              <Button
                icon="people"
                variant="ghost"
                className={styles.menuAction}
                onClick={() => navigate(`${view}/people`, true)}
              >
                People & invitations
              </Button>
              {role === "owner" ? (
                <Button
                  icon="wallet"
                  variant="ghost"
                  className={styles.menuAction}
                  onClick={() => navigate(`${view}/qr`, true)}
                >
                  Manage payment QR
                </Button>
              ) : null}
              <Button
                icon="people"
                variant="ghost"
                className={styles.menuAction}
                onClick={() => navigate("join", true)}
              >
                Join as someone else
              </Button>
              <DesignCopyButton onCopy={copyLink} className={styles.fullButton}>
                Copy invitation link
              </DesignCopyButton>
              <div className={styles.menuFooter}>
                <Button icon="replay" variant="ghost" onClick={reset}>
                  Reset example
                </Button>
                {role === "owner" ? (
                  <Button
                    variant="ghost"
                    className={styles.removeButton}
                    onClick={() => navigate(`${view}/delete`, true)}
                  >
                    Delete bill
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
          {sheetOverlay === "people" ? (
            <>
              <p className={styles.sheetDescription}>
                One private link keeps everyone together.
              </p>
              <ul className={styles.peopleList}>
                <AnimatePresence initial={false}>
                  {people.map((item) => (
                    <motion.li
                      key={item.id}
                      layout="position"
                      initial={
                        reducedMotion !== false
                          ? false
                          : { opacity: 0, height: 0 }
                      }
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={motionTransition(
                        reducedMotion !== false,
                        motionTiming.reveal,
                      )}
                    >
                      <div className={styles.peopleRow}>
                        <Avatar person={item} />
                        <span>
                          <strong>
                            {item.display_name}
                            {item.id === currentId ? " (you)" : ""}
                          </strong>
                          <small>
                            {item.is_creator
                              ? "Bill owner"
                              : item.waiting
                                ? "Waiting to join"
                                : "Joined"}
                          </small>
                        </span>
                        <span className={styles.joinedDot} />
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <DesignCopyButton onCopy={copyLink} className={styles.fullButton}>
                Copy invitation link
              </DesignCopyButton>
              <div className={styles.inviteAction}>
                <InlinePersonForm
                  expanded={addingPerson || overlay === "person"}
                  onExpand={() => setAddingPerson(true)}
                  value={newPerson}
                  onValueChange={setNewPerson}
                  people={people}
                  onSave={addPerson}
                />
              </div>
            </>
          ) : null}
          {sheetOverlay === "qr" ? (
            <>
              <p className={styles.sheetDescription}>
                {qrEnabled
                  ? "Your group can use this QR when they settle with you."
                  : "Add a QR to give your group an easy way to pay."}
              </p>
              {qrEnabled ? (
                <div className={styles.paymentQr}>
                  {qrImage ? (
                    <Image
                      unoptimized
                      src={qrImage}
                      alt="Sample owner QR preview"
                      width={208}
                      height={208}
                    />
                  ) : null}
                  <strong>NARY CHAN</strong>
                  <span>ABA · USD</span>
                  <small>QR preview</small>
                </div>
              ) : null}
              <Button
                icon={qrEnabled ? undefined : "upload"}
                variant={qrEnabled ? "secondary" : "primary"}
                className={styles.fullButton}
                onClick={() => {
                  setQrEnabled(!qrEnabled);
                  setNotice(
                    qrEnabled ? "Payment QR removed." : "Payment QR added.",
                  );
                }}
              >
                {qrEnabled ? "Remove payment QR" : "Use example QR"}
              </Button>
            </>
          ) : null}
          {sheetOverlay === "remove" ? (
            <>
              <p className={styles.sheetDescription}>
                Remove {detail?.description} from the bill? Everyone’s balance
                will update.
              </p>
              <div className={styles.confirmButtons}>
                <Button variant="secondary" onClick={dismiss}>
                  Keep expense
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setExpenses((current) =>
                      current.filter((item) => item.id !== detail?.id),
                    );
                    addActivity(`Removed ${detail?.description}`);
                    setNotice("Expense removed. Balances updated.");
                    navigate("expenses", true);
                  }}
                >
                  Remove expense
                </Button>
              </div>
            </>
          ) : null}
          {sheetOverlay === "delete" ? (
            <>
              <p className={styles.sheetDescription}>
                Everyone will lose access to this bill and its expenses.
              </p>
              <div className={styles.confirmButtons}>
                <Button variant="secondary" onClick={dismiss}>
                  Keep bill
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleted(true);
                    navigate("overview", true);
                  }}
                >
                  Delete bill
                </Button>
              </div>
            </>
          ) : null}
          {error && overlay ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </Sheet>
      </div>
    </div>
  );
}
