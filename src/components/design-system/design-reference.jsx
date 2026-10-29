"use client";

import { useDesignReducedMotion } from "./use-design-reduced-motion";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import {
  DesignAlert,
  DesignBadge,
  DesignButton,
  DesignCheckbox,
  DesignField,
  DesignSurface,
} from "./primitives";
import { FormShowcase } from "./form-showcase";
import { DatePickerShowcase } from "./date-picker-showcase";
import { DesignCopyButton } from "./copy-button";
import { IconComparison } from "./icon-comparison";
import { AnimatedTabs, AnimatedTabPanels } from "./animated-tabs";
import { MotionShowcase } from "./motion-showcase";
import { motionTiming } from "./motion-tokens";
import { PersonPicker, PersonPickerShowcase } from "./person-picker";
import system from "./system.module.css";
import styles from "./reference.module.css";

const defaults = {
  brand: "#663399",
  frost: 45,
  corners: "round",
  density: "comfortable",
};

function Icon({ name, ...props }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6m-6 4h6" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <circle cx="15" cy="17" r="3" fill="currentColor" />
      </>
    ),
    food: (
      <>
        <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-4 10 0 10" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

function SectionHeading({ number, title, description }) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.sectionNumber}>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function DesignReference() {
  const theme = defaults;
  const [tab, setTab] = useState("balances");
  const [notice, setNotice] = useState("");
  const [themeNotice, setThemeNotice] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [saved, setSaved] = useState(false);
  const [dialogClosing, setDialogClosing] = useState(false);
  const reducedMotion = useDesignReducedMotion();
  const dialog = useRef(null);
  const dialogTimer = useRef(null);
  useEffect(() => () => clearTimeout(dialogTimer.current), []);
  const receiptInput = useRef(null);
  const [themeJSON, setThemeJSON] = useState("");
  const reference = useRef(null);

  function openDialog() {
    clearTimeout(dialogTimer.current);
    setDialogClosing(false);
    dialog.current?.showModal();
  }

  function closeDialog() {
    clearTimeout(dialogTimer.current);
    if (reducedMotion) {
      dialog.current?.close();
      setDialogClosing(false);
      return;
    }
    setDialogClosing(true);
    dialogTimer.current = setTimeout(() => {
      dialog.current?.close();
      setDialogClosing(false);
    }, motionTiming.exit * 1000);
  }

  async function copyTheme() {
    const computed = getComputedStyle(reference.current);
    const tokens = Object.fromEntries(
      [
        "brand",
        "brand-text",
        "brand-ink",
        "canvas",
        "surface",
        "text",
        "muted",
        "line",
        "tint",
        "control-radius",
        "card-radius",
        "control-height",
        "panel-padding",
        "row-padding",
        "glass-opacity",
        "glass-blur",
        "font-heading",
        "font-body",
        "weight-heading",
        "motion-fast",
        "motion-standard",
        "motion-reveal",
        "motion-exit",
        "motion-ease",
      ].map((name) => [
        `--ds-${name}`,
        computed
          .getPropertyValue(`--ds-${name}`)
          .trim()
          .replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i, "#$1$1$2$2$3$3"),
      ]),
    );
    const settings = JSON.stringify(
      { ...theme, brand: tokens["--ds-brand"], tokens },
      null,
      2,
    );
    setThemeJSON(settings);
    try {
      await navigator.clipboard.writeText(settings);
      setThemeNotice("Theme settings copied.");
      return true;
    } catch {
      setShowTokens(true);
      setThemeNotice("Select and copy the settings below.");
      return false;
    }
  }

  async function copyReferenceLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Design reference link copied.");
      return true;
    } catch {
      setNotice(
        "Couldn’t copy automatically. Copy the reference URL from your address bar.",
      );
      return false;
    }
  }

  return (
    <div ref={reference} className={`${system.theme} ${styles.page}`}>
      <div className={styles.studioHeader}>
        <a href="#overview" className={styles.wordmark}>
          <BrandMark size={30} />
          Bill Splitter <span className={styles.headerDivider} />{" "}
          <span className={styles.studioLabel}>Design studio</span>
        </a>
        <span className={styles.draftLabel}>
          <span /> Approved · 1.0
        </span>
      </div>

      <div className={styles.container}>
        <section id="overview" className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>THE BILL SPLITTER DESIGN SYSTEM</p>
            <h1>
              A clearer way
              <br />
              to split.
            </h1>
            <p className={styles.heroDescription}>
              A little purple. A little glass. A shared set of details that
              makes everything feel like it belongs.
            </p>
            <div className={styles.heroMeta}>
              <span className={styles.purpleDot} /> Component reference{" "}
              <span className={styles.metaDivider}>/</span> Interactive preview
            </div>
          </div>
          <div className={styles.heroStage}>
            <span className={styles.orbOne} />
            <span className={styles.orbTwo} />
            <span className={styles.orbThree} />
            <span className={styles.stageGrid} />
            <DesignSurface glass className={styles.heroCard}>
              <div className={styles.between}>
                <span className={styles.cardEyebrow}>YOUR BALANCE</span>
                <span className={styles.miniLogo} aria-hidden="true">
                  ↗
                </span>
              </div>
              <p className={styles.balanceAmount}>
                $24<span>.50</span>
              </p>
              <p className={styles.balanceCaption}>to settle up with friends</p>
              <div className={styles.balanceFooter}>
                <div className={styles.avatars}>
                  <span>JD</span>
                  <span>SK</span>
                  <span>ML</span>
                </div>
                <span>
                  Weekend dinner <span aria-hidden="true">↗</span>
                </span>
              </div>
            </DesignSurface>
            <span className={styles.materialLabel}>
              <span /> Liquid glass / summary card
            </span>
          </div>
        </section>

        <nav
          className={`${system.glass} ${styles.jumpNav}`}
          aria-label="Component sections"
        >
          <a href="#foundations">Foundations</a>
          <a href="#controls">Controls</a>
          <a href="#date-picker">Calendar</a>
          <a href="#motion">Motion</a>
          <a href="#materials">Materials</a>
          <a href="#patterns">In context</a>
          <a href="#forms">Drawers & forms</a>
          <span className={styles.navCaption}>
            Made to be adjusted <span aria-hidden="true">↘</span>
          </span>
        </nav>

        <div className={styles.workspace}>
          <div className={styles.sections}>
            <section id="foundations" className={styles.section}>
              <SectionHeading
                number="01"
                title="The foundations"
                description="Purple leads. Warm neutrals give it room to breathe."
              />
              <DesignSurface>
                <div className={styles.swatches}>
                  {[
                    ["Brand", theme.brand, "var(--ds-brand)"],
                    ["Lavender", "Brand · 8%", "var(--ds-tint)"],
                    ["Canvas", "#F7F6FA", "var(--ds-canvas)"],
                    ["Ink", "#272231", "var(--ds-text)"],
                    ["Positive", "#23614D", "#23614d"],
                  ].map(([name, value, color]) => (
                    <div key={name} className={styles.swatch}>
                      <div style={{ background: color }} />
                      <strong>{name}</strong>
                      <span>{value.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.typeSpecimen}>
                  <div>
                    <span className={styles.smallLabel}>TYPOGRAPHY</span>
                    <p className={styles.typeLetters}>Aa</p>
                    <span className={styles.muted}>
                      Helvetica Bold · headings
                    </span>
                  </div>
                  <div className={styles.typeScale}>
                    <p>Weekend, well split.</p>
                    <p>Every expense, accounted for.</p>
                    <p>Paid by you · shared with everyone</p>
                    <p>Details stay quiet until you need them.</p>
                    <span className={styles.muted}>
                      Helvetica · body & controls
                    </span>
                  </div>
                </div>
                <div className={styles.spacingSpecimen}>
                  <span className={styles.smallLabel}>SPACING</span>
                  <div>
                    {[4, 8, 12, 16, 24, 32].map((size) => (
                      <div key={size}>
                        <span style={{ width: size, height: size }} />
                        <span>{size}</span>
                      </div>
                    ))}
                  </div>
                  <span className={styles.muted}>
                    A consistent 4 px rhythm.
                  </span>
                </div>
              </DesignSurface>
            </section>

            <section id="controls" className={styles.section}>
              <SectionHeading
                number="02"
                title="Everyday controls"
                description="Clear actions. Comfortable fields. No extra steps."
              />
              <DesignSurface>
                <p className={styles.smallLabel}>BUTTONS</p>
                <div className={styles.buttonRow}>
                  <DesignButton
                    icon="plus"
                    onClick={() =>
                      setNotice(
                        "Add expense selected. This is a visual preview.",
                      )
                    }
                  >
                    Add expense
                  </DesignButton>
                  <DesignButton
                    icon="upload"
                    variant="secondary"
                    onClick={() => receiptInput.current?.click()}
                  >
                    Upload receipt
                  </DesignButton>
                  <DesignCopyButton variant="ghost" onCopy={copyReferenceLink}>
                    Copy link
                  </DesignCopyButton>
                </div>
                <div className={styles.buttonRow}>
                  <DesignButton disabled>Disabled</DesignButton>
                  <DesignButton disabled aria-busy="true">
                    <span className={styles.spinner} aria-hidden="true" />
                    Saving…
                  </DesignButton>
                  <span className={styles.muted}>
                    Default, secondary, quiet, and pending states.
                  </span>
                </div>
                <p role="status" className={styles.demoNotice}>
                  {notice}
                </p>
                <div className={styles.rule} />
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSaved(true);
                  }}
                >
                  <div className={styles.formGrid}>
                    <DesignField
                      id="studio-description"
                      label="Expense name"
                      defaultValue="Dinner at the little place"
                      required
                      maxLength={100}
                    />
                    <DesignField
                      id="studio-amount"
                      label="Amount · USD"
                      defaultValue="48.00"
                      inputMode="decimal"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <PersonPicker
                      id="studio-paid-by"
                      label="Paid by"
                      name="paidBy"
                    />
                    <DesignField
                      id="studio-error"
                      label="Error state example"
                      defaultValue=""
                      error="Enter an amount greater than zero."
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <fieldset className={styles.peopleField}>
                    <legend>Split with</legend>
                    <div>
                      {["You", "Sokha", "Mali"].map((name) => (
                        <DesignCheckbox key={name} defaultChecked>
                          {name}
                        </DesignCheckbox>
                      ))}
                    </div>
                  </fieldset>
                  <div className={styles.formFooter}>
                    <DesignButton icon="check" type="submit">
                      Preview save
                    </DesignButton>
                    <p role="status">
                      {saved
                        ? "Saved in this preview. No real bill was changed."
                        : "Try the controls. All data here is sample data."}
                    </p>
                  </div>
                </form>
              </DesignSurface>
              <PersonPickerShowcase />
              <DatePickerShowcase />
            </section>

            <section id="motion" className={styles.section}>
              <SectionHeading
                number="03"
                title="Motion & interaction"
                description="Small, deliberate movements. Try the icon libraries and shared motion below."
              />
              <IconComparison />
              <MotionShowcase onPreviewDialog={openDialog} />
            </section>

            <section id="materials" className={styles.section}>
              <SectionHeading
                number="04"
                title="A considered use of glass"
                description="Glass for orientation and highlights. Solid surfaces for the details."
              />
              <div className={styles.materialGrid}>
                <div className={styles.materialStage}>
                  <span className={styles.materialStripe} />
                  <DesignSurface glass className={styles.materialCard}>
                    <span className={styles.materialIcon}>
                      <Icon name="sliders" />
                    </span>
                    <h3>Liquid glass</h3>
                    <p>Navigation, floating controls, and balance summaries.</p>
                    <span className={styles.materialTag}>
                      Light · layered · translucent
                    </span>
                  </DesignSurface>
                </div>
                <div className={styles.solidStage}>
                  <DesignSurface className={styles.materialCard}>
                    <span className={styles.materialIcon}>
                      <Icon name="receipt" />
                    </span>
                    <h3>Solid surface</h3>
                    <p>Forms, receipt review, and expense details.</p>
                    <span className={styles.materialTag}>
                      Calm · focused · readable
                    </span>
                  </DesignSurface>
                </div>
              </div>
              <DesignSurface className={styles.feedbackCard}>
                <div className={styles.between}>
                  <h3>Status & feedback</h3>
                  <span className={styles.muted}>Words + color</span>
                </div>
                <div className={styles.badgeRow}>
                  <DesignBadge tone="success">Settled</DesignBadge>
                  <DesignBadge tone="warning">Needs review</DesignBadge>
                  <DesignBadge>Draft</DesignBadge>
                  <DesignBadge tone="danger">Upload failed</DesignBadge>
                </div>
                <DesignAlert tone="info">
                  <strong>Your receipt is ready to review.</strong>
                  <p>Check the items before adding them to the bill.</p>
                </DesignAlert>
                <DesignAlert tone="danger">
                  <strong>We couldn’t save this expense.</strong>
                  <p>Your entries are still here. Please try again.</p>
                </DesignAlert>
              </DesignSurface>
            </section>

            <section id="patterns" className={styles.section}>
              <SectionHeading
                number="05"
                title="See it come together"
                description="A few familiar moments, with the same visual language."
              />
              <DesignSurface className={styles.contextCard}>
                <div className={styles.between}>
                  <div>
                    <p className={styles.smallLabel}>SAMPLE BILL</p>
                    <h3 className={styles.billTitle}>Weekend dinner</h3>
                    <p className={styles.muted}>3 people · USD</p>
                  </div>
                  <span className={styles.contextIcon}>
                    <Icon name="food" width="24" height="24" />
                  </span>
                </div>
                <AnimatedTabs
                  id="bill-preview"
                  label="Sample bill view"
                  tabs={["expenses", "balances", "activity"]}
                  value={tab}
                  onValueChange={setTab}
                />
                <AnimatedTabPanels id="bill-preview" value={tab}>
                  {tab === "balances" && (
                    <>
                      <div className={styles.expenseRow}>
                        <div className={styles.personAvatar}>JD</div>
                        <div className={styles.rowText}>
                          <strong>You</strong>
                          <span>Paid $48.00 · share $16.00</span>
                        </div>
                        <div className={styles.rowEnd}>
                          <strong className={styles.positive}>+$32.00</strong>
                          <span>to receive</span>
                        </div>
                      </div>
                      {["Sokha", "Mali"].map((name) => (
                        <div className={styles.expenseRow} key={name}>
                          <div className={styles.personAvatar}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className={styles.rowText}>
                            <strong>{name}</strong>
                            <span>Share of dinner</span>
                          </div>
                          <div className={styles.rowEnd}>
                            <strong>$16.00</strong>
                            <span>to pay</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {tab === "expenses" && (
                    <div className={styles.expenseRow}>
                      <span className={styles.personAvatar}>
                        <Icon name="food" />
                      </span>
                      <div className={styles.rowText}>
                        <strong>Dinner at the little place</strong>
                        <span>Paid by you · split equally</span>
                      </div>
                      <div className={styles.rowEnd}>
                        <strong>$48.00</strong>
                        <span>Food & drinks</span>
                      </div>
                    </div>
                  )}
                  {tab === "activity" && (
                    <div className={styles.expenseRow}>
                      <span className={styles.personAvatar}>
                        <Icon name="plus" />
                      </span>
                      <div className={styles.rowText}>
                        <strong>You added dinner</strong>
                        <span>$48.00 · shared with 3 people</span>
                      </div>
                      <span className={styles.muted}>Just now</span>
                    </div>
                  )}
                </AnimatedTabPanels>
                <div className={styles.contextFooter}>
                  <span className={styles.muted}>
                    Sample data for visual review
                  </span>
                  <DesignButton
                    icon="arrow"
                    iconPosition="end"
                    variant="secondary"
                    onClick={openDialog}
                  >
                    Preview confirmation
                  </DesignButton>
                </div>
              </DesignSurface>
              <DesignSurface className={styles.receiptPattern}>
                <div className={styles.uploadIcon}>
                  <Icon name="upload" width="22" height="22" />
                </div>
                <div className={styles.receiptCopy}>
                  <h3>One receipt. One action.</h3>
                  <p>Choose an image, then review the extracted items.</p>
                  <span className={styles.hint}>
                    JPEG, PNG, or HEIC · up to 10 MB
                  </span>
                </div>
                <DesignButton
                  icon="plus"
                  onClick={() => receiptInput.current?.click()}
                >
                  Choose receipt
                </DesignButton>
                <input
                  ref={receiptInput}
                  type="file"
                  accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                  hidden
                  aria-label="Sample receipt image"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file)
                      setReceiptName(
                        file.size > 10 * 1024 * 1024
                          ? "That image is larger than 10 MB. Choose a smaller image."
                          : `${file.name} selected. Preview only; no upload or scan was started.`,
                      );
                  }}
                />
                <p role="status" className={styles.receiptStatus}>
                  {receiptName}
                </p>
              </DesignSurface>
            </section>
            <section id="forms" className={styles.section}>
              <SectionHeading
                number="06"
                title="A place for every task"
                description="Drawers for quick changes. Focused forms for details. Clear confirmations."
              />
              <FormShowcase />
            </section>
          </div>

          <aside
            className={styles.appearance}
            aria-labelledby="appearance-heading"
          >
            <div className={styles.appearanceHeader}>
              <span className={styles.settingsIcon}>
                <Icon name="sliders" />
              </span>
              <div>
                <h2 id="appearance-heading">Approved foundations</h2>
                <p>The shared app baseline.</p>
              </div>
            </div>
            <dl className={styles.approvedFoundations}>
              <div>
                <dt>Primary color</dt>
                <dd>#663399</dd>
              </div>
              <div>
                <dt>Corners</dt>
                <dd>Round · 22px / 32px</dd>
              </div>
              <div>
                <dt>Spacing</dt>
                <dd>Relaxed · 48px controls</dd>
              </div>
              <div>
                <dt>Glass frost</dt>
                <dd>45% · selective glass</dd>
              </div>
              <div>
                <dt>Headings</dt>
                <dd>Helvetica Bold · 700</dd>
              </div>
              <div>
                <dt>Body</dt>
                <dd>Helvetica</dd>
              </div>
              <div>
                <dt>Icons</dt>
                <dd>Animate UI</dd>
              </div>
              <div>
                <dt>Shimmer</dt>
                <dd>One soft 1.8-second pass</dd>
              </div>
            </dl>
            <div className={styles.settingsActions}>
              <DesignCopyButton variant="secondary" onCopy={copyTheme}>
                Copy theme
              </DesignCopyButton>
            </div>
            <p role="status" className={styles.themeNotice}>
              {themeNotice}
            </p>
            {showTokens && (
              <label className={system.field}>
                Theme settings
                <textarea
                  className={styles.tokenOutput}
                  readOnly
                  value={themeJSON}
                  onFocus={(event) => event.target.select()}
                />
              </label>
            )}
            <div className={styles.referenceNote}>
              <span className={styles.noteDot} />
              <p>
                The approved component guide.
                <br />
                Shared with the main app.
              </p>
            </div>
          </aside>
        </div>
        <footer className={styles.footer}>
          <span>Bill Splitter · Design reference</span>
          <span>Thoughtful details. Less friction.</span>
          <Link href="/">
            Back to the app <span aria-hidden="true">↗</span>
          </Link>
        </footer>
      </div>

      <dialog
        ref={dialog}
        data-closing={dialogClosing || undefined}
        className={`${system.surface} ${system.glass} ${styles.dialog}`}
        aria-labelledby="confirmation-heading"
        aria-describedby="confirmation-description"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              closeDialog();
          }
        }}
      >
        <div className={styles.between}>
          <DesignBadge>Confirmation preview</DesignBadge>
          <DesignButton
            type="button"
            variant="ghost"
            icon="close"
            className={styles.closeButton}
            onClick={closeDialog}
            aria-label="Close confirmation"
          />
        </div>
        <h2 id="confirmation-heading">Remove this expense?</h2>
        <p id="confirmation-description">
          This is how a destructive action will be confirmed. This preview won’t
          change any bill.
        </p>
        <div className={styles.dialogActions}>
          <DesignButton variant="secondary" onClick={closeDialog}>
            Keep expense
          </DesignButton>
          <DesignButton
            variant="dangerButton"
            onClick={() => {
              closeDialog();
              setNotice(
                "Confirmation preview completed. No expense was removed.",
              );
            }}
          >
            Remove expense
          </DesignButton>
        </div>
      </dialog>
    </div>
  );
}
