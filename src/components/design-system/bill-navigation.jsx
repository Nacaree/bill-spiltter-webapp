"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { House } from "./icons/animate-ui/house";
import { ReceiptText } from "./icons/receipt-text";
import { Wallet } from "./icons/animate-ui/wallet";
import { navigationIconTiming } from "./motion-tokens";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import styles from "./bill-navigation.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export const billNavigationItems = [
  { id: "overview", label: "Overview", Icon: House, iconDuration: 0.6 },
  { id: "expenses", label: "Expenses", Icon: ReceiptText },
  { id: "settle", label: "Settle", Icon: Wallet, iconDuration: 0.5 },
];

function NavigationIcon({ item, play, highlight }) {
  const [active, setActive] = useState(false);
  const { Icon, iconDuration } = item;

  useEffect(() => {
    if (!play) return;
    let cancelled = false;
    // Read after layout so a retargeted CSS transition exists before waiting.
    const frame = requestAnimationFrame(() => {
      const transitions = highlight.current?.getAnimations() ?? [];
      Promise.all(transitions.map((transition) => transition.finished))
        .then(() => {
          if (!cancelled) setActive(true);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [play, highlight]);

  return (
    <Icon
      key={active ? "chosen" : "still"}
      size={20}
      animate={active && play}
      {...(iconDuration
        ? { speed: iconDuration / navigationIconTiming.duration }
        : {})}
    />
  );
}

export function BillNavigation({
  value,
  onValueChange,
  className,
  label = "Bill sections",
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [hasSelected, setHasSelected] = useState(false);
  const highlight = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  const selectedIndex = billNavigationItems.findIndex(
    (item) => item.id === value,
  );

  return (
    <nav className={cn(styles.navigation, className)} aria-label={label}>
      <div
        className={styles.track}
        style={{ "--navigation-selected": Math.max(0, selectedIndex) }}
      >
        <span
          ref={highlight}
          className={styles.iconSelection}
          data-navigation-indicator="quiet"
          aria-hidden="true"
        />
        {billNavigationItems.map((item) => {
          const selected = item.id === value;
          const play = selected && hasSelected && reducedMotion === false;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!ready}
              className={styles.destination}
              aria-current={selected ? "page" : undefined}
              onClick={() => {
                if (selected) return;
                setHasSelected(true);
                onValueChange(item.id);
              }}
            >
              <span className={styles.symbol} aria-hidden="true">
                <NavigationIcon
                  key={play ? "pending" : "still"}
                  item={item}
                  play={play}
                  highlight={highlight}
                />
              </span>
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
