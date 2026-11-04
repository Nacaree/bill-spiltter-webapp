"use client";

import { useCallback, useEffect, useRef } from "react";
import { DesignButton } from "./primitives";
import { Upload } from "./icons/animate-ui/upload";
import { Plus } from "./icons/animate-ui/plus";
import { PencilLine } from "./icons/animate-ui/pencil-line";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import { drawerChevronTiming } from "./motion-tokens";
import { ReceiptArt } from "./receipt-art";
import styles from "./bill-entry-choices.module.css";

function Arrow() {
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
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function AnimatedChoiceButton({ onClick, children, ...props }) {
  const reducedMotion = useDesignReducedMotion();
  const animations = useRef([]);
  const cancel = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }, []);

  useEffect(() => {
    if (reducedMotion !== false) cancel();
    return cancel;
  }, [reducedMotion, cancel]);

  function replay(button) {
    if (reducedMotion !== false || button.disabled) return;
    const chevron = button.querySelector("[data-choice-chevron]");
    if (!chevron?.animate) return;
    cancel();
    const cycle = [
      chevron.animate(
        [
          { transform: "translateX(0)" },
          {
            transform: `translateX(${drawerChevronTiming.distance}px)`,
            offset: 0.45,
          },
          { transform: "translateX(0)" },
        ],
        {
          duration: drawerChevronTiming.duration,
          easing: drawerChevronTiming.easing,
        },
      ),
    ];
    animations.current = cycle;
    Promise.allSettled(cycle.map((animation) => animation.finished)).then(
      () => {
        if (animations.current === cycle) cancel();
      },
    );
  }

  return (
    <DesignButton
      {...props}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") replay(event.currentTarget);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible"))
          replay(event.currentTarget);
      }}
      onPointerDown={(event) => {
        if (event.button === 0 || event.pointerType === "touch")
          replay(event.currentTarget);
      }}
      onPointerCancel={cancel}
      onClick={(event) => {
        // Pointer presses already started their gesture; keyboard activation
        // and assistive-technology clicks start one here.
        if (event.detail === 0) replay(event.currentTarget);
        onClick?.(event);
      }}
    >
      {children}
    </DesignButton>
  );
}

function Choice({
  preview,
  onSelect,
  action,
  icon,
  animateChevron,
  className,
  children,
}) {
  if (preview) return <div className={className}>{children}</div>;
  const Button = animateChevron ? AnimatedChoiceButton : DesignButton;
  return (
    <Button
      variant="secondary"
      icon={icon}
      className={className}
      onClick={() => onSelect(action)}
    >
      {(icon) => children(icon)}
    </Button>
  );
}

export function BillEntryChoices({
  direction = "spotlight",
  preview = false,
  onSelect,
  receiptPlaying = true,
}) {
  const renderChoice = (action) => {
    const receipt = action === "receipt";
    const writing = direction === "spotlight" && !receipt;
    const Icon = receipt ? Upload : writing ? PencilLine : Plus;
    const title = receipt ? "Scan a receipt" : "Enter manually";
    const detail = receipt
      ? direction === "tiles"
        ? "Split item by item"
        : "Review the items, then split"
      : direction === "tiles"
        ? "Add an amount"
        : "For anything without a receipt";
    const content = (icon) => (
      <>
        <span className={styles.choiceIcon} aria-hidden="true">
          {icon || <Icon size={22} animate={false} />}
        </span>
        <span className={styles.choiceCopy}>
          {direction === "spotlight" && receipt && (
            <span className={styles.kicker}>ITEM BY ITEM</span>
          )}
          <strong>{title}</strong>
          {direction !== "compact" && <small>{detail}</small>}
        </span>
        {direction === "spotlight" && receipt ? (
          <ReceiptArt playing={receiptPlaying} />
        ) : direction !== "compact" ? (
          <span className={styles.arrow} data-choice-chevron>
            <Arrow />
          </span>
        ) : null}
      </>
    );
    return (
      <Choice
        key={action}
        preview={preview}
        onSelect={onSelect}
        action={action}
        animateChevron={writing}
        icon={receipt ? "upload" : writing ? "pencil" : "plus"}
        className={`${styles.choice} ${receipt ? styles.scan : styles.manual}`}
      >
        {preview ? content() : content}
      </Choice>
    );
  };

  return (
    <div
      className={`${styles.choices} ${styles[direction]}`}
      data-bill-entry-choices={direction}
    >
      {renderChoice("receipt")}
      {renderChoice("manual")}
      {direction === "compact" && (
        <p className={styles.compactHint}>
          A receipt or a rough total. Both work.
        </p>
      )}
    </div>
  );
}

export function ReceiptAnimationToggle({ playing, onPlayingChange }) {
  const reducedMotion = useDesignReducedMotion();
  return (
    <DesignButton
      variant="ghost"
      className={styles.animationToggle}
      disabled={reducedMotion !== false}
      aria-label={
        reducedMotion === true
          ? "Motion off: reduced motion is enabled"
          : playing
            ? "Pause animation: receipt illustration"
            : "Play animation: receipt illustration"
      }
      onClick={() => onPlayingChange(!playing)}
    >
      {reducedMotion === true
        ? "Motion off"
        : playing
          ? "Pause animation"
          : "Play animation"}
    </DesignButton>
  );
}
