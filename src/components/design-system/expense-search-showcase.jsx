"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import { ExpenseSearch } from "./expense-search";
import { sampleExpenses } from "./expense-preview-data";
import { Coffee } from "./icons/animate-ui/coffee";
import { Route } from "./icons/animate-ui/route";
import styles from "./expense-search-showcase.module.css";

const mobileEffects = [
  {
    id: "tap-ripple",
    searchDesign: "tint",
    effect: "ripple",
    name: "Tap ripple",
    description:
      "A lavender ripple opens from your fingertip and fades into the glass.",
    hint: "Tap different parts of the field. Keyboard focus starts in the center.",
    reference: "https://magicui.design/docs/components/ripple-button",
    source: "Magic UI · Ripple Button",
  },
  {
    id: "glass-press",
    searchDesign: "tint",
    effect: "press",
    name: "Glass press",
    description:
      "The glass gently presses down, then springs back as you lift your finger.",
    hint: "Press and release the field. Text and caret stay steady.",
    reference: "https://motion.dev/docs/react-gestures",
    source: "Motion · Tap gestures",
  },
  {
    id: "center-underline",
    searchDesign: "tint",
    effect: "underline",
    name: "Center-out underline",
    description:
      "A fine purple line opens from the center, then retracts when you leave.",
    hint: "Tap into the field, then tap a filter to close the line.",
    reference: "https://motion.dev/docs/react-svg-animation",
    source: "Motion · Line drawing",
  },
  {
    id: "magnifier-draw",
    searchDesign: "tint",
    effect: "draw",
    name: "Magnifier draw",
    description:
      "The circle and handle draw themselves once as you enter search.",
    hint: "Tap or Tab into the field. Leave and return to draw again.",
    reference: "https://motion.dev/docs/react-svg-animation",
    source: "Motion · SVG animation",
  },
  {
    id: "search-morph",
    searchDesign: "tint",
    effect: "morph",
    name: "Search morph",
    description:
      "The field makes room for Cancel, creating a focused little search mode.",
    hint: "Tap to open. Cancel or Escape clears search and restores the field.",
    reference: "https://www.cult-ui.com/docs/components/morph-surface",
    source: "Cult UI · Morph Surface",
  },
  {
    id: "search-morph-press",
    searchDesign: "tint",
    effect: "morph-press",
    name: "Search morph + Glass press",
    description:
      "A soft glass press as you tap, with the field opening room for Cancel.",
    hint: "Press, release and type. Cancel closes search; Clear keeps it open.",
    reference: "https://www.cult-ui.com/docs/components/morph-surface",
    source: "Cult UI · Morph Surface + Motion tap gestures",
  },
];

const surfaces = [
  {
    id: "quiet-glass",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "quiet",
    name: "Quiet glass",
    description:
      "A barely visible neutral edge becomes one fine purple line on focus.",
    hint: "One thin edge, with the combined morph and glass press.",
  },
  {
    id: "borderless-glass",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "borderless",
    name: "Borderless glass",
    description:
      "Soft frost and a faint shadow. Tapping gently deepens the surface.",
    hint: "Tap to draw the magnifier and press the glass. Keyboard focus keeps a single inset stroke.",
  },
  {
    id: "fine-underline",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "underline",
    name: "Fine underline",
    description:
      "An open, transparent field with a fine bottom line and a purple focus accent.",
    hint: "The same morph and press, with a lighter editorial treatment.",
  },
];

const clearEffects = [
  {
    id: "clear-soft-twist",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "borderless",
    clearMotion: "twist",
    initialQuery: "coffee",
    name: "Soft twist",
    description:
      "The X twists its strokes, shrinks and fades as the search clears.",
    hint: "Tap the X. Refill the example to try again.",
  },
  {
    id: "clear-stroke-erase",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "borderless",
    clearMotion: "erase",
    initialQuery: "coffee",
    name: "Stroke erase",
    description: "Both strokes retract toward the center and disappear.",
    hint: "Tap the X, then refill or type to bring it back.",
  },
  {
    id: "clear-soft-pop",
    searchDesign: "tint",
    effect: "morph-press",
    surface: "borderless",
    clearMotion: "pop",
    initialQuery: "coffee",
    name: "Soft pop",
    description:
      "The X springs in as you type, compresses on touch and fades away.",
    hint: "Clear, then refill to see the entrance spring.",
  },
];

function SearchOption({ design, index, selected, onPreview }) {
  const [query, setQuery] = useState(design.initialQuery ?? "");
  const [filter, setFilter] = useState("All");
  const matches = sampleExpenses.filter(
    (item) =>
      (filter !== "Paid by you" || item.payer === "Nary") &&
      (filter !== "Receipts" || item.receipt) &&
      `${item.name} ${item.payer} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  return (
    <figure className={styles.option} data-search-option={design.id}>
      <figcaption className={styles.caption}>
        <span className={styles.number}>0{index + 1}</span>
        <h3>{design.name}</h3>
        <p>{design.description}</p>
      </figcaption>
      <div className={styles.stage}>
        <div className={styles.context}>
          <span>WEEKEND DINNER</span>
          <span>$102.00 total</span>
        </div>
        <div className={styles.title}>
          <span>Expenses</span>
          <span>03</span>
        </div>
        <ExpenseSearch
          design={design.searchDesign ?? design.id}
          effect={design.effect}
          surface={design.surface}
          clearMotion={design.clearMotion}
          value={query}
          onValueChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          label={`Search ${design.name.toLowerCase()} expenses`}
        />
        <p role="status" className={styles.resultCount}>
          {matches.length
            ? `${matches.length} ${matches.length === 1 ? "expense" : "expenses"}`
            : "No matching expenses"}
        </p>
        <ul className={styles.results}>
          {matches.map((item) => {
            const Icon = item.category === "Transport" ? Route : Coffee;
            return (
              <li key={item.id}>
                <span className={styles.categoryIcon} aria-hidden="true">
                  <Icon size={18} animate={false} />
                </span>
                <span className={styles.expenseCopy}>
                  <strong>{item.name}</strong>
                  <span>Paid by {item.payer}</span>
                </span>
                <strong className={styles.amount}>
                  {formatMoney(item.amount, "USD")}
                </strong>
              </li>
            );
          })}
        </ul>
        {!matches.length && (
          <p className={styles.noResults}>
            Try a name like Nary, or show all expenses.
          </p>
        )}
      </div>
      <div className={styles.optionFooter}>
        <DesignButton
          variant="secondary"
          icon="arrow"
          iconPosition="end"
          className={styles.previewButton}
          aria-label={`Preview in Atelier: ${design.name}`}
          aria-pressed={selected}
          onClick={() =>
            onPreview(
              design.searchDesign ?? design.id,
              design.effect ?? "none",
              design.surface ?? "original",
              design.clearMotion ?? "none",
            )
          }
        >
          Preview in Atelier
        </DesignButton>
        {design.clearMotion && (
          <DesignButton
            variant="ghost"
            icon="replay"
            aria-label={`Refill example: ${design.name}`}
            onClick={() => setQuery("coffee")}
          >
            Refill example
          </DesignButton>
        )}
        <span>
          {selected
            ? "Shown in Atelier"
            : (design.hint ?? "Try typing coffee or Sokha")}
        </span>
        {design.reference && (
          <a href={design.reference} target="_blank" rel="noreferrer">
            Inspiration: {design.source} ↗
          </a>
        )}
      </div>
    </figure>
  );
}

export function ExpenseSearchShowcase({
  activeDesign,
  activeEffect = "none",
  activeSurface = "original",
  activeClearMotion = "none",
  onPreview,
}) {
  function selected(design) {
    return (
      activeDesign === (design.searchDesign ?? design.id) &&
      activeEffect === (design.effect ?? "none") &&
      activeSurface === (design.surface ?? "original") &&
      activeClearMotion === (design.clearMotion ?? "none")
    );
  }
  return (
    <>
      <div id="expense-search-clear" className={styles.effectsHeading}>
        <h3>A little exit</h3>
        <p>
          Three ways to clear the same borderless search. Each starts with
          coffee typed in. Tap the X, then refill to replay.
        </p>
      </div>
      <div className={`${styles.gallery} ${styles.effectsGallery}`}>
        {clearEffects.map((design, index) => (
          <SearchOption
            key={design.id}
            design={design}
            index={index}
            selected={selected(design)}
            onPreview={onPreview}
          />
        ))}
      </div>
      <div id="expense-search-surfaces" className={styles.effectsHeading}>
        <h3>A lighter edge</h3>
        <p>
          Three surface treatments with Search morph + Glass press. Tap to
          compare the focus state, then try each in Atelier.
        </p>
      </div>
      <div className={`${styles.gallery} ${styles.effectsGallery}`}>
        {surfaces.map((design, index) => (
          <SearchOption
            key={design.id}
            design={design}
            index={index}
            selected={selected(design)}
            onPreview={onPreview}
          />
        ))}
      </div>
      <div id="expense-search-mobile" className={styles.effectsHeading}>
        <h3>Made for a thumb</h3>
        <p>
          Six touch-first search treatments. Tap, type and clear, then preview
          your favorite in Atelier.
        </p>
      </div>
      <div className={styles.gallery}>
        {mobileEffects.map((design, index) => (
          <SearchOption
            key={design.id}
            design={design}
            index={index}
            selected={selected(design)}
            onPreview={onPreview}
          />
        ))}
      </div>
    </>
  );
}
