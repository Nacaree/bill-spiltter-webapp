"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "./screens.module.css";

const journeys = {
  owner: [
    ["overview", "Bill overview", "See the bill at a glance"],
    ["people", "People & invite", "Add people and share the link"],
    ["balances", "Balances & QR", "Debts and payment settings"],
    ["history", "Manage bill", "Edit history or delete the bill"],
  ],
  settler: [
    ["join", "Join the bill", "Claim a name or add yourself"],
    ["overview", "Your overview", "See your identity and balance"],
    ["pay", "Pay the owner", "Scan the owner’s payment QR"],
    ["record", "Record payment", "Update the shared balance"],
  ],
  shared: [
    ["expense", "Add expense", "Create and split a shared expense"],
    ["receipt", "Receipt review", "Scan and assign receipt items"],
    ["activity", "Shared activity", "Review the common bill history"],
    ["processing", "Receipt processing", "Try success and failure states"],
    ["empty", "Empty bill", "See the first-use experience"],
    ["unavailable", "Unavailable bill", "Deleted and missing states"],
  ],
};

const roleCopy = {
  owner: [
    "Bill owner",
    "Invite, manage, receive payments, and close the bill.",
  ],
  settler: ["Settler", "Join, understand what you owe, and settle up."],
  shared: [
    "Shared journeys",
    "Expenses, receipts, and activity both roles work with.",
  ],
};

const mobileNavigation = {
  owner: [
    ["overview", "Home", "home"],
    ["people", "People", "users"],
    ["balances", "Settle", "wallet"],
    ["history", "Manage", "more"],
  ],
  settler: [
    ["overview", "Home", "home"],
    ["pay", "Pay", "wallet"],
    ["record", "Record", "check"],
    ["join", "Identity", "users"],
  ],
  shared: [
    ["expense", "Add", "plus"],
    ["receipt", "Receipt", "upload"],
    ["activity", "Activity", "home"],
    ["processing", "Process", "receipt"],
    ["empty", "Empty", "more"],
  ],
};

const initialExpenses = [
  {
    id: 1,
    description: "Dinner at Malis",
    amount: "48.00",
    paidBy: "You",
    category: "Food & drinks",
  },
  {
    id: 2,
    description: "Tuk-tuk home",
    amount: "9.00",
    paidBy: "Sokha",
    category: "Transport",
  },
];

const receiptItems = [
  ["Fish amok", "22.00"],
  ["Morning glory", "8.00"],
  ["Iced tea", "9.00"],
];

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 15V4m0 0L8 8m4-4 4 4" />
        <path d="M5 14v5h14v-5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15v13H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
        <path d="M15 11h6v4h-6z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function AppHeader({ role, participantName, onOpenMenu }) {
  return (
    <header className={styles.appHeader}>
      <span className={styles.appBrand}>
        <b>B</b>
        <strong>Bill Splitter</strong>
      </span>
      <button
        className={styles.appRole}
        type="button"
        onClick={onOpenMenu}
        aria-label={`Open prototype menu, currently ${roleCopy[role][0]}`}
      >
        <span>{role === "settler" ? participantName : roleCopy[role][0]}</span>
        <Icon name="more" size={16} />
      </button>
    </header>
  );
}

function BillHeading({ role, participantName, copyLink }) {
  return (
    <div className={styles.billHeading}>
      <div>
        <p className={styles.eyebrow}>Shared bill</p>
        <h2>Weekend dinner</h2>
        <p className={styles.muted}>USD · 3 people</p>
      </div>
      <Button
        className={styles.copyButton}
        type="button"
        variant="secondary"
        icon="copy"
        onClick={copyLink}
      >
        Copy link
      </Button>
      {role !== "shared" ? (
        <p className={styles.identity}>
          You’re{" "}
          {role === "owner"
            ? "the bill owner"
            : `joining as ${participantName}`}
        </p>
      ) : null}
    </div>
  );
}

function Panel({ title, eyebrow, children, tint = false }) {
  return (
    <section className={`${styles.panel} ${tint ? styles.tintPanel : ""}`}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

function Field({ label, children, hint, ...props }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children ?? <input {...props} />}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function PersonRow({ name, owner, waiting }) {
  return (
    <li className={styles.personRow}>
      <span className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
      <strong>{name}</strong>
      <span className={waiting ? styles.waitingPill : styles.pill}>
        {owner ? "Owner" : waiting ? "Waiting to join" : "Joined"}
      </span>
    </li>
  );
}

function BalanceRow({ name, detail, amount, positive }) {
  return (
    <li className={styles.balanceRow}>
      <span className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <strong className={positive ? styles.positive : styles.negative}>
        {amount}
      </strong>
    </li>
  );
}

function ExpenseCard({ expense, onEdit, onRemove, editable = true }) {
  const share = (Number(expense.amount) / 3).toFixed(2);
  return (
    <article className={styles.expenseCard}>
      <div className={styles.expenseMain}>
        <span className={styles.expenseIcon}>🍜</span>
        <span>
          <strong>{expense.description}</strong>
          <small>
            Paid by {expense.paidBy} · {expense.category}
          </small>
        </span>
        <strong>${expense.amount}</strong>
      </div>
      <div className={styles.shares}>
        <span>You · ${share}</span>
        <span>Sokha · ${share}</span>
        <span>Mali · ${share}</span>
      </div>
      {editable ? (
        <div className={styles.cardActions}>
          <button type="button" onClick={onEdit}>
            Edit expense
          </button>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ExpenseForm({ role, participantName, onSave, editing, notify }) {
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const [category, setCategory] = useState(
    editing?.category ?? "Food & drinks",
  );
  const [paidBy, setPaidBy] = useState(
    editing?.paidBy ?? (role === "owner" ? "You" : participantName),
  );
  const [split, setSplit] = useState(["You", "Sokha", "Mali"]);
  function submit(event) {
    event.preventDefault();
    if (!description.trim() || !Number(amount))
      return notify("Add a description and an amount greater than zero.");
    onSave({
      id: editing?.id ?? Date.now(),
      description: description.trim(),
      amount: Number(amount).toFixed(2),
      paidBy,
      category,
    });
  }
  return (
    <form className={styles.expenseForm} onSubmit={submit}>
      <Field
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Dinner at Malis"
      />
      <Field
        label="Amount · USD"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="0.00"
      />
      <Field label="Paid by">
        <select
          value={paidBy}
          disabled={role !== "shared"}
          onChange={(event) => setPaidBy(event.target.value)}
        >
          <option>You</option>
          <option>{participantName}</option>
        </select>
      </Field>
      <Field label="Category">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>Food & drinks</option>
          <option>Transport</option>
          <option>Shopping</option>
          <option>Other</option>
        </select>
      </Field>
      <fieldset className={styles.splitFieldset}>
        <legend>Split with</legend>
        <div>
          {["You", "Sokha", "Mali"].map((person) => (
            <label
              key={person}
              className={split.includes(person) ? styles.selectedPerson : ""}
            >
              <input
                type="checkbox"
                checked={split.includes(person)}
                onChange={() =>
                  setSplit((current) =>
                    current.includes(person)
                      ? current.filter((item) => item !== person)
                      : [...current, person],
                  )
                }
              />
              <span className={styles.avatar}>
                {person.slice(0, 2).toUpperCase()}
              </span>
              {person}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Notes (optional)">
        <textarea rows="3" placeholder="Add a note for everyone" />
      </Field>
      <Button icon="check" type="submit">
        {editing ? "Save changes" : "Add expense"}
      </Button>
    </form>
  );
}

function OwnerScreen({ step, state, actions }) {
  const { people, expenses, qrConfigured, editing } = state;
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  if (step === "overview")
    return (
      <>
        <BillHeading
          role="owner"
          participantName="You"
          copyLink={actions.copyLink}
        />
        <div className={styles.summaryGrid}>
          <Panel title="People">
            <ul className={styles.list}>
              {people.slice(0, 3).map((person, index) => (
                <PersonRow key={person} name={person} owner={index === 0} />
              ))}
            </ul>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => actions.go("people")}
            >
              Manage people <Icon name="arrow" size={15} />
            </button>
          </Panel>
          <Panel title="At a glance" tint>
            <dl className={styles.metrics}>
              <div>
                <dt>Total</dt>
                <dd>${total.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Expenses</dt>
                <dd>{expenses.length}</dd>
              </div>
              <div>
                <dt>To receive</dt>
                <dd>$32.00</dd>
              </div>
            </dl>
          </Panel>
        </div>
        <div className={styles.quickActions}>
          <button
            type="button"
            onClick={() => actions.switchTo("shared", "expense")}
          >
            <Icon name="plus" /> Add expense
          </button>
          <button
            type="button"
            onClick={() => actions.switchTo("shared", "receipt")}
          >
            <Icon name="upload" /> Upload receipt
          </button>
          <button type="button" onClick={() => actions.go("balances")}>
            <Icon name="wallet" /> Settle up
          </button>
        </div>
        <div className={styles.sectionHeading}>
          <div>
            <h3>Recent expenses</h3>
            <p>Newest expenses appear first.</p>
          </div>
          <button type="button" onClick={() => actions.go("history")}>
            View all
          </button>
        </div>
        <div className={styles.expenseList}>
          {expenses.slice(0, 2).map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} editable={false} />
          ))}
        </div>
      </>
    );
  if (step === "people")
    return (
      <PeopleScreen
        people={people}
        setPeople={actions.setPeople}
        copyLink={actions.copyLink}
        notify={actions.notify}
      />
    );
  if (step === "expense")
    return (
      <>
        <BillHeading
          role="owner"
          participantName="You"
          copyLink={actions.copyLink}
        />
        <div className={styles.pageIntro}>
          <p className={styles.eyebrow}>Expense ledger</p>
          <h2>{editing ? "Edit expense" : "Add an expense"}</h2>
          <p>Split the total equally or choose exactly who shared it.</p>
        </div>
        <Panel>
          <ExpenseForm
            role="owner"
            participantName="You"
            editing={editing}
            notify={actions.notify}
            onSave={actions.saveExpense}
          />
        </Panel>
      </>
    );
  if (step === "receipt")
    return (
      <ReceiptScreen role="owner" participantName="You" actions={actions} />
    );
  if (step === "balances")
    return (
      <>
        <BillHeading
          role="owner"
          participantName="You"
          copyLink={actions.copyLink}
        />
        <div className={styles.pageIntro}>
          <p className={styles.eyebrow}>Balances & settle up</p>
          <h2>You’ll receive $32.00</h2>
          <p>These balances include recorded payments.</p>
        </div>
        <div className={styles.contentGrid}>
          <Panel title="Current balances">
            <ul className={styles.list}>
              <BalanceRow
                name="You"
                detail="Paid $48 · share $16"
                amount="+$32.00"
                positive
              />
              <BalanceRow name="Sokha" detail="Owes you" amount="−$16.00" />
              <BalanceRow name="Mali" detail="Owes you" amount="−$16.00" />
            </ul>
          </Panel>
          <Panel
            title="Owner ABA QR settings"
            eyebrow={qrConfigured ? "Ready to receive" : "Not configured"}
            tint
          >
            {qrConfigured ? (
              <div className={styles.qrIdentity}>
                <span className={styles.qrSmall} />
                <div>
                  <strong>NARY CHAN</strong>
                  <small>USD + KHR · No fixed amount</small>
                </div>
              </div>
            ) : (
              <p className={styles.helpText}>
                Add a payment QR so people can settle directly with you.
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={actions.toggleQr}
            >
              {qrConfigured ? "Remove owner QR" : "Add sample QR"}
            </Button>
          </Panel>
        </div>
        <Panel title="Recorded payments">
          <div className={styles.emptyInline}>No payments recorded yet.</div>
        </Panel>
      </>
    );
  return <HistoryScreen expenses={expenses} actions={actions} />;
}

function PeopleScreen({ people, setPeople, copyLink, notify }) {
  const [name, setName] = useState("");
  function add(event) {
    event.preventDefault();
    const next = name.trim();
    if (!next || people.includes(next))
      return notify(
        next ? `${next} is already on this bill.` : "Enter a name first.",
      );
    setPeople((current) => [...current, next]);
    setName("");
    notify(`${next} was added and can claim their name.`);
  }
  return (
    <>
      <BillHeading role="owner" participantName="You" copyLink={copyLink} />
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>People & access</p>
        <h2>Invite everyone to the bill</h2>
        <p>Share the private link, or reserve a name for someone.</p>
      </div>
      <div className={styles.contentGrid}>
        <Panel title={`${people.length} people`}>
          <ul className={styles.list}>
            {people.map((person, index) => (
              <PersonRow
                key={person}
                name={person}
                owner={index === 0}
                waiting={index > 2}
              />
            ))}
          </ul>
        </Panel>
        <Panel title="Add someone" eyebrow="Reserve a name">
          <form className={styles.formStack} onSubmit={add}>
            <Field
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dara"
            />
            <Button type="submit">Add person</Button>
          </form>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <Button
            icon="copy"
            type="button"
            variant="secondary"
            onClick={copyLink}
          >
            Copy private link
          </Button>
        </Panel>
      </div>
    </>
  );
}

function ReceiptScreen({ role, participantName, actions }) {
  const [reviewing, setReviewing] = useState(false);
  const [selected, setSelected] = useState(receiptItems.map(([name]) => name));
  function confirm() {
    actions.addReceipt(role === "owner" ? "You" : participantName);
  }
  return (
    <>
      <BillHeading
        role={role}
        participantName={participantName}
        copyLink={actions.copyLink}
      />
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>Receipt upload</p>
        <h2>{reviewing ? "Review scanned items" : "Import a receipt"}</h2>
        <p>Nothing changes the balance until you confirm.</p>
      </div>
      {!reviewing ? (
        <Panel>
          <div className={styles.uploadZone}>
            <span>
              <Icon name="upload" size={30} />
            </span>
            <h3>Choose a receipt image</h3>
            <p>Try the sample scan to see the full review flow.</p>
            <Button
              icon="upload"
              type="button"
              onClick={() => setReviewing(true)}
            >
              Scan sample receipt
            </Button>
            <small>JPEG, PNG, or HEIC · up to 10 MB</small>
          </div>
        </Panel>
      ) : (
        <div className={styles.reviewGrid}>
          <Panel title="Brown Coffee" eyebrow="3 items found">
            <div className={styles.receiptItems}>
              {receiptItems.map(([name, amount]) => (
                <label
                  key={name}
                  className={
                    selected.includes(name) ? styles.receiptSelected : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(name)
                          ? current.filter((item) => item !== name)
                          : [...current, name],
                      )
                    }
                  />
                  <span>
                    <strong>{name}</strong>
                    <small>Shared with everyone</small>
                  </span>
                  <strong>${amount}</strong>
                </label>
              ))}
            </div>
            <div className={styles.total}>
              <span>Receipt total</span>
              <strong>$39.00</strong>
            </div>
          </Panel>
          <Panel title="Ready to add?" tint>
            <p className={styles.helpText}>
              {selected.length} of {receiptItems.length} items included. Tax and
              rounding are allocated proportionally.
            </p>
            <Button
              icon="check"
              type="button"
              onClick={confirm}
              disabled={!selected.length}
            >
              Confirm and add expense
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReviewing(false)}
            >
              Choose another image
            </Button>
          </Panel>
        </div>
      )}
    </>
  );
}

function HistoryScreen({ expenses, actions }) {
  return (
    <>
      <BillHeading
        role="owner"
        participantName="You"
        copyLink={actions.copyLink}
      />
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Expense ledger</p>
          <h2>Manage the bill</h2>
          <p>Review, edit, or remove any expense.</p>
        </div>
        <span className={styles.pill}>{expenses.length} expenses</span>
      </div>
      <div className={styles.expenseList}>
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onEdit={() => actions.editExpense(expense)}
            onRemove={() => actions.removeExpense(expense.id)}
          />
        ))}
      </div>
      <Panel title="Recent changes">
        <ul className={styles.activityList}>
          <li>
            <span>✓</span>
            <p>
              <strong>You added Dinner at Malis</strong>
              <small>Today · 7:42 PM</small>
            </p>
          </li>
          <li>
            <span>↗</span>
            <p>
              <strong>Sokha joined the bill</strong>
              <small>Today · 7:31 PM</small>
            </p>
          </li>
        </ul>
      </Panel>
      <section className={styles.dangerZone}>
        <div>
          <h3>Delete this bill</h3>
          <p>This permanently removes expenses, receipts, and access.</p>
        </div>
        <button type="button" onClick={actions.openDelete}>
          <Icon name="trash" size={16} /> Delete bill
        </button>
      </section>
    </>
  );
}

function SettlerScreen({ step, state, actions }) {
  const { participantName, expenses, settled, editing } = state;
  if (step === "join")
    return <JoinScreen participantName={participantName} actions={actions} />;
  if (step === "overview")
    return (
      <>
        <BillHeading
          role="settler"
          participantName={participantName}
          copyLink={actions.copyLink}
        />
        <div className={styles.summaryGrid}>
          <Panel title="Your balance" tint>
            <div className={styles.owedAmount}>
              <small>
                {settled ? "You’re all settled" : "You owe the owner"}
              </small>
              <strong>{settled ? "$0.00" : "$16.00"}</strong>
            </div>
            {!settled ? (
              <Button type="button" onClick={() => actions.go("pay")}>
                Settle up
              </Button>
            ) : null}
          </Panel>
          <Panel title="Your access">
            <p className={styles.helpText}>
              You can add, edit, and remove expenses from this device.
            </p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => actions.go("join")}
            >
              Switch identity
            </button>
          </Panel>
        </div>
        <div className={styles.quickActions}>
          <button
            type="button"
            onClick={() => actions.switchTo("shared", "expense")}
          >
            <Icon name="plus" /> Add expense
          </button>
          <button
            type="button"
            onClick={() => actions.switchTo("shared", "receipt")}
          >
            <Icon name="upload" /> Upload receipt
          </button>
          <button type="button" onClick={() => actions.go("pay")}>
            <Icon name="wallet" /> Pay owner
          </button>
        </div>
        <div className={styles.sectionHeading}>
          <div>
            <h3>Expense history</h3>
            <p>Everyone sees the same shared ledger.</p>
          </div>
        </div>
        <div className={styles.expenseList}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} editable={false} />
          ))}
        </div>
      </>
    );
  if (step === "expense")
    return (
      <>
        <BillHeading
          role="settler"
          participantName={participantName}
          copyLink={actions.copyLink}
        />
        <div className={styles.pageIntro}>
          <p className={styles.eyebrow}>Expense ledger</p>
          <h2>{editing ? "Edit expense" : "Add an expense"}</h2>
          <p>Joined people use the same contribution tools.</p>
        </div>
        <Panel>
          <ExpenseForm
            role="settler"
            participantName={participantName}
            editing={editing}
            notify={actions.notify}
            onSave={actions.saveExpense}
          />
        </Panel>
      </>
    );
  if (step === "receipt")
    return (
      <ReceiptScreen
        role="settler"
        participantName={participantName}
        actions={actions}
      />
    );
  if (step === "pay")
    return (
      <>
        <BillHeading
          role="settler"
          participantName={participantName}
          copyLink={actions.copyLink}
        />
        <Panel title="Pay the bill owner" eyebrow="You owe $16.00">
          <div className={styles.payHero}>
            <small>Amount to settle</small>
            <strong>$16.00</strong>
            <p>
              Scan with ABA Mobile, then confirm the recipient before paying.
            </p>
          </div>
          <div className={styles.qrLarge}>
            <span />
            <small>NARY CHAN · ABA</small>
          </div>
          <div className={styles.recipient}>
            <span>Recipient</span>
            <strong>NARY CHAN</strong>
            <span>Currency</span>
            <strong>USD</strong>
          </div>
          <Button type="button" onClick={() => actions.go("record")}>
            I’ve paid — record it
          </Button>
        </Panel>
      </>
    );
  return <RecordPayment participantName={participantName} actions={actions} />;
}

function JoinScreen({ participantName, actions }) {
  const [mode, setMode] = useState("claim");
  const [newName, setNewName] = useState("");
  function submit(event) {
    event.preventDefault();
    const name = mode === "claim" ? participantName : newName.trim();
    if (!name) return actions.notify("Choose or enter your name first.");
    actions.join(name);
  }
  return (
    <>
      <BillHeading
        role="shared"
        participantName={participantName}
        copyLink={actions.copyLink}
      />
      <div className={styles.lockedNotice}>
        Join this bill first to add receipts or change expenses.
      </div>
      <Panel title="Join this bill" eyebrow="No account needed">
        <p className={styles.helpText}>
          Joining remembers you on this device and unlocks contribution tools.
        </p>
        <div className={styles.modeToggle}>
          <button
            type="button"
            aria-pressed={mode === "claim"}
            onClick={() => setMode("claim")}
          >
            I’m already listed
          </button>
          <button
            type="button"
            aria-pressed={mode === "new"}
            onClick={() => setMode("new")}
          >
            Add me instead
          </button>
        </div>
        <form className={styles.formStack} onSubmit={submit}>
          {mode === "claim" ? (
            <Field label="Choose your name">
              <select
                value={participantName}
                onChange={(event) =>
                  actions.setParticipantName(event.target.value)
                }
              >
                <option>Sokha</option>
                <option>Mali</option>
              </select>
            </Field>
          ) : (
            <Field
              label="Your name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Dara"
            />
          )}
          <Button type="submit">
            {mode === "claim" ? "Continue as this person" : "Join bill"}
          </Button>
        </form>
      </Panel>
    </>
  );
}

function RecordPayment({ participantName, actions }) {
  const [amount, setAmount] = useState("16.00");
  function submit(event) {
    event.preventDefault();
    if (!Number(amount)) return actions.notify("Enter the amount you paid.");
    actions.recordPayment(amount);
  }
  return (
    <>
      <BillHeading
        role="settler"
        participantName={participantName}
        copyLink={actions.copyLink}
      />
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>Settle up</p>
        <h2>Record your payment</h2>
        <p>This updates the balance for everyone.</p>
      </div>
      <Panel>
        <form className={styles.formStack} onSubmit={submit}>
          <Field label="From" value={participantName} readOnly />
          <Field label="To" value="You (owner)" readOnly />
          <Field
            label="Amount · USD"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Field label="Payment date" type="date" defaultValue="2026-10-29" />
          <Field label="Note (optional)" placeholder="ABA transfer" />
          <Button icon="check" type="submit">
            Record payment
          </Button>
        </form>
      </Panel>
    </>
  );
}

function SharedScreen({ step, state, actions }) {
  if (step === "expense")
    return (
      <>
        <BillHeading
          role="shared"
          participantName={state.participantName}
          copyLink={actions.copyLink}
        />
        <div className={styles.pageIntro}>
          <p className={styles.eyebrow}>Shared journey</p>
          <h2>Add an expense</h2>
          <p>
            Owners and settlers use this same form. Choose who paid, then split
            the total.
          </p>
        </div>
        <Panel>
          <ExpenseForm
            role="shared"
            participantName={state.participantName}
            editing={state.editing}
            notify={actions.notify}
            onSave={actions.saveExpense}
          />
        </Panel>
      </>
    );
  if (step === "receipt")
    return (
      <ReceiptScreen
        role="shared"
        participantName={state.participantName}
        actions={actions}
      />
    );
  if (step === "activity")
    return <SharedActivityScreen expenses={state.expenses} actions={actions} />;
  if (step === "create") return <CreateScreen actions={actions} />;
  if (step === "processing") return <ProcessingScreen />;
  if (step === "empty")
    return (
      <>
        <BillHeading
          role="shared"
          participantName=""
          copyLink={actions.copyLink}
        />
        <Panel>
          <div className={styles.resultState}>
            <span className={styles.emptyIcon}>
              <Icon name="receipt" size={30} />
            </span>
            <h3>No expenses yet</h3>
            <p>
              Add the first expense manually or upload a receipt to start the
              ledger.
            </p>
            <div className={styles.emptyActions}>
              <Button type="button" onClick={() => actions.go("expense")}>
                Add expense
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => actions.go("receipt")}
              >
                Upload receipt
              </Button>
            </div>
          </div>
        </Panel>
        <Panel title="Balances">
          <div className={styles.emptyInline}>
            Balances appear after an expense is shared.
          </div>
        </Panel>
      </>
    );
  return <UnavailableScreen actions={actions} />;
}

function SharedActivityScreen({ expenses, actions }) {
  return (
    <>
      <BillHeading
        role="shared"
        participantName=""
        copyLink={actions.copyLink}
      />
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>Shared journey</p>
        <h2>Bill activity</h2>
        <p>
          The owner and every settler see the same expenses and recent changes.
        </p>
      </div>
      <div className={styles.expenseList}>
        {expenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} editable={false} />
        ))}
      </div>
      <Panel title="Recent changes">
        <ul className={styles.activityList}>
          <li>
            <span>✓</span>
            <p>
              <strong>You added Dinner at Malis</strong>
              <small>Today · 7:42 PM</small>
            </p>
          </li>
          <li>
            <span>↗</span>
            <p>
              <strong>Sokha recorded a $16 payment</strong>
              <small>Today · 8:05 PM</small>
            </p>
          </li>
        </ul>
      </Panel>
    </>
  );
}

function CreateScreen({ actions }) {
  const [billName, setBillName] = useState("Weekend dinner");
  function submit(event) {
    event.preventDefault();
    actions.createBill(billName);
  }
  return (
    <div className={styles.createLayout}>
      <section className={styles.createHero}>
        <p className={styles.eyebrow}>Shared costs, simplified</p>
        <h2>Split the bill, not the friendship.</h2>
        <p>
          Add people, upload receipts, and understand every balance—all from one
          private link.
        </p>
      </section>
      <Panel title="Create a bill">
        <form className={styles.formStack} onSubmit={submit}>
          <Field
            label="Bill name"
            value={billName}
            onChange={(event) => setBillName(event.target.value)}
          />
          <Field label="Currency">
            <select defaultValue="USD">
              <option>USD</option>
              <option>KHR</option>
            </select>
          </Field>
          <Field label="Your name" defaultValue="Nary" />
          <Button type="submit">Create sample bill</Button>
        </form>
      </Panel>
    </div>
  );
}

function ProcessingScreen() {
  const [state, setState] = useState("scanning");
  return (
    <>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>Shared state</p>
        <h2>Receipt processing</h2>
        <p>Use the controls to inspect every outcome.</p>
      </div>
      <div className={styles.modeToggle}>
        {["scanning", "ready", "failed"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={state === value}
            onClick={() => setState(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      <Panel>
        {state === "scanning" ? (
          <div className={styles.processing}>
            <span className={styles.scanner}>
              <Icon name="receipt" size={40} />
            </span>
            <h3>Scanning receipt</h3>
            <p>Reading merchant, totals, and line items…</p>
            <div className={styles.progress}>
              <span />
            </div>
          </div>
        ) : null}
        {state === "ready" ? (
          <div className={styles.resultState}>
            <span className={styles.successIcon}>
              <Icon name="check" size={28} />
            </span>
            <h3>Your receipt is ready</h3>
            <p>3 items found. Review them before adding the expense.</p>
            <Button type="button">Review receipt</Button>
          </div>
        ) : null}
        {state === "failed" ? (
          <div className={styles.resultState}>
            <span className={styles.errorIcon}>!</span>
            <h3>We couldn’t read every item</h3>
            <p>
              Your image is still here. Retry or enter the expense manually.
            </p>
            <Button type="button" onClick={() => setState("scanning")}>
              Retry scan
            </Button>
          </div>
        ) : null}
      </Panel>
    </>
  );
}

function UnavailableScreen({ actions }) {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className={styles.unavailable}>
      <div className={styles.modeToggle}>
        <button
          type="button"
          aria-pressed={!deleted}
          onClick={() => setDeleted(false)}
        >
          Not found
        </button>
        <button
          type="button"
          aria-pressed={deleted}
          onClick={() => setDeleted(true)}
        >
          Deleted
        </button>
      </div>
      <p className={styles.eyebrow}>{deleted ? "Bill deleted" : "404"}</p>
      <h2>
        {deleted
          ? "This bill is no longer available."
          : "That bill could not be found."}
      </h2>
      <p>
        {deleted
          ? "The bill is no longer available to anyone. Image removal may still be pending."
          : "Check the private link or ask its owner to share it again."}
      </p>
      <Button type="button" onClick={() => actions.go("create")}>
        Create a new bill
      </Button>
    </div>
  );
}

export function ScreenPrototype() {
  const [role, setRole] = useState("owner");
  const [step, setStep] = useState("overview");
  const [people, setPeople] = useState(["You", "Sokha", "Mali"]);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [participantName, setParticipantName] = useState("Sokha");
  const [qrConfigured, setQrConfigured] = useState(true);
  const [settled, setSettled] = useState(false);
  const [toast, setToast] = useState(
    "Try the controls—everything here uses sample data.",
  );
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const steps = journeys[role];
  function chooseRole(nextRole) {
    setRole(nextRole);
    setStep(journeys[nextRole][0][0]);
    setEditing(null);
    setMenuOpen(false);
    setToast(`${roleCopy[nextRole][0]} journey selected.`);
  }
  function go(next) {
    setStep(next);
    setEditing(null);
    setMenuOpen(false);
  }
  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(
        "https://billsplitter.app/b/weekend-dinner",
      );
    } catch {}
    setToast("Private sample link copied.");
  }
  function saveExpense(expense) {
    setExpenses((current) =>
      current.some((item) => item.id === expense.id)
        ? current.map((item) => (item.id === expense.id ? expense : item))
        : [expense, ...current],
    );
    setEditing(null);
    setToast(
      editing ? "Expense updated." : "Expense added to the sample bill.",
    );
    setStep(
      role === "owner"
        ? "history"
        : role === "shared"
          ? "activity"
          : "overview",
    );
  }
  function reset() {
    setRole("owner");
    setStep("overview");
    setPeople(["You", "Sokha", "Mali"]);
    setExpenses(initialExpenses);
    setParticipantName("Sokha");
    setQrConfigured(true);
    setSettled(false);
    setDeleteDialog(false);
    setMenuOpen(false);
    setEditing(null);
    setToast("Prototype reset to its starting state.");
  }
  const actions = {
    go,
    notify: setToast,
    copyLink,
    setPeople,
    setParticipantName,
    saveExpense,
    editExpense: (expense) => {
      setEditing(expense);
      setStep("expense");
    },
    removeExpense: (id) => {
      setExpenses((current) => current.filter((item) => item.id !== id));
      setToast("Expense removed from the sample bill.");
    },
    addReceipt: (paidBy) => {
      setExpenses((current) => [
        {
          id: Date.now(),
          description: "Brown Coffee receipt",
          amount: "39.00",
          paidBy,
          category: "Food & drinks",
        },
        ...current,
      ]);
      setToast("Receipt confirmed and added as an expense.");
      setStep(
        role === "owner"
          ? "history"
          : role === "shared"
            ? "activity"
            : "overview",
      );
    },
    toggleQr: () => {
      setQrConfigured((value) => !value);
      setToast(qrConfigured ? "Owner QR removed." : "Sample owner QR saved.");
    },
    openDelete: () => setDeleteDialog(true),
    join: (name) => {
      setParticipantName(name);
      setToast(`You joined the sample bill as ${name}.`);
      setStep("overview");
    },
    recordPayment: (amount) => {
      setSettled(true);
      setToast(`Payment of $${Number(amount).toFixed(2)} recorded.`);
      setStep("overview");
    },
    switchTo: (nextRole, nextStep) => {
      setRole(nextRole);
      setStep(nextStep);
      setEditing(null);
      setMenuOpen(false);
    },
    createBill: (name) => {
      setToast(`${name || "New bill"} created in the prototype.`);
      setRole("owner");
      setStep("overview");
    },
  };
  const state = {
    people,
    expenses,
    participantName,
    qrConfigured,
    settled,
    editing,
  };
  const content =
    role === "owner" ? (
      <OwnerScreen step={step} state={state} actions={actions} />
    ) : role === "settler" ? (
      <SettlerScreen step={step} state={state} actions={actions} />
    ) : (
      <SharedScreen step={step} state={state} actions={actions} />
    );
  return (
    <div className={styles.mobilePrototypePage}>
      <section
        className={styles.mobileShell}
        aria-label="Interactive mobile Bill Splitter prototype"
      >
        <div className={styles.prototypeBanner}>
          <span className={styles.liveDot} /> Interactive sample · no real data
        </div>
        <AppHeader
          role={role}
          participantName={participantName}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main className={styles.appCanvas} key={`${role}-${step}`}>
          {content}
        </main>
        <p className={styles.toast} role="status">
          {toast}
        </p>
        <nav
          className={styles.mobileNav}
          aria-label={`${roleCopy[role][0]} screens`}
        >
          {mobileNavigation[role].map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              aria-current={step === id ? "page" : undefined}
              onClick={() => go(id)}
            >
              <Icon name={icon} size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
      {menuOpen ? (
        <div
          className={styles.sheetBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <section
            className={styles.prototypeSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prototype-menu-heading"
          >
            <span className={styles.sheetHandle} />
            <div className={styles.sheetHeading}>
              <div>
                <p className={styles.eyebrow}>Interactive prototype</p>
                <h2 id="prototype-menu-heading">Choose what to explore</h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close prototype menu"
              >
                ×
              </button>
            </div>
            <div
              className={styles.sheetRoles}
              role="group"
              aria-label="Choose a role"
            >
              {Object.entries(roleCopy).map(([key, [label]]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={role === key}
                  onClick={() => chooseRole(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <h3>{roleCopy[role][0]} screens</h3>
            <div className={styles.sheetScreens}>
              {steps.map(([id, label, description], index) => (
                <button
                  key={id}
                  type="button"
                  aria-current={step === id ? "page" : undefined}
                  onClick={() => go(id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <Icon name="arrow" size={17} />
                </button>
              ))}
            </div>
            <button className={styles.sheetReset} type="button" onClick={reset}>
              <Icon name="reset" size={17} /> Reset sample data
            </button>
          </section>
        </div>
      ) : null}
      {deleteDialog ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteDialog(false);
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-prototype-title"
          >
            <p className={styles.eyebrow}>Confirmation preview</p>
            <h2 id="delete-prototype-title">Delete this bill?</h2>
            <p>
              This only simulates deletion. No real bill or image will be
              removed.
            </p>
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteDialog(false)}
              >
                Keep bill
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteDialog(false);
                  setRole("shared");
                  setStep("unavailable");
                  setToast("Sample bill deleted in the prototype.");
                }}
              >
                Delete sample bill
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
