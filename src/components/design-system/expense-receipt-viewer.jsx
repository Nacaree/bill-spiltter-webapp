"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { formatPickerDate } from "@/components/ui/date-picker";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import styles from "./expense-receipt-viewer.module.css";

export function ExpenseReceiptViewer({
  expense,
  date,
  open,
  onOpenChange,
  returnFocusRef,
}) {
  const close = useRef(null);
  const paper = useRef(null);
  const anchor = useRef(null);
  const [viewport, setViewport] = useState(null);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ width: 360, height: 450 });

  useLayoutEffect(() => {
    if (!viewport || !paper.current) return;
    function measure() {
      if (!paper.current) return;
      const css = getComputedStyle(viewport);
      const availableWidth =
        viewport.clientWidth -
        parseFloat(css.paddingLeft) -
        parseFloat(css.paddingRight);
      const availableHeight =
        viewport.clientHeight -
        parseFloat(css.paddingTop) -
        parseFloat(css.paddingBottom);
      const width = Math.max(
        1,
        Math.min(440, availableWidth, availableHeight / 1.25),
      );
      const height = paper.current.offsetHeight;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(paper.current);
    measure();
    return () => observer.disconnect();
  }, [viewport]);

  useLayoutEffect(() => {
    if (!anchor.current || !viewport || !paper.current) return;
    const point = anchor.current;
    anchor.current = null;
    const image = paper.current.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    viewport.scrollBy({
      left: image.left + point.x * scale - view.left - viewport.clientWidth / 2,
      top: image.top + point.y * scale - view.top - viewport.clientHeight / 2,
    });
  }, [scale, viewport]);

  function zoom(next) {
    if (viewport && paper.current) {
      const image = paper.current.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      anchor.current = {
        x: (view.left + viewport.clientWidth / 2 - image.left) / scale,
        y: (view.top + viewport.clientHeight / 2 - image.top) / scale,
      };
    }
    setScale(Math.min(2, Math.max(0.5, next)));
  }

  function fit() {
    anchor.current = null;
    setScale(1);
    viewport?.scrollTo({ top: 0, left: 0 });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.viewer}
          data-receipt-viewer
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            fit();
            close.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus({ preventScroll: true });
          }}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              <Dialog.Title>Receipt preview</Dialog.Title>
              <Dialog.Description>{expense.name}</Dialog.Description>
            </div>
            <div
              className={styles.tools}
              role="group"
              aria-label="Receipt zoom controls"
            >
              <DesignButton
                variant="ghost"
                aria-label="Zoom out"
                disabled={scale <= 0.5}
                onClick={() => zoom(scale - 0.25)}
              >
                −
              </DesignButton>
              <output
                role="status"
                aria-live="polite"
                aria-label="Receipt zoom"
              >
                {Math.round(scale * 100)}%
              </output>
              <DesignButton
                variant="ghost"
                aria-label="Zoom in"
                disabled={scale >= 2}
                onClick={() => zoom(scale + 0.25)}
              >
                +
              </DesignButton>
              <DesignButton
                variant="ghost"
                onClick={fit}
                aria-label="Fit receipt"
              >
                Fit
              </DesignButton>
            </div>
            <Dialog.Close asChild>
              <DesignButton
                ref={close}
                variant="ghost"
                icon="close"
                className={styles.close}
                aria-label="Close receipt preview"
              />
            </Dialog.Close>
          </header>
          <div
            ref={setViewport}
            className={styles.viewport}
            role="region"
            aria-label="Receipt document"
            tabIndex={0}
            data-receipt-viewport
          >
            <div className={styles.canvas}>
              <div
                className={styles.frame}
                style={{
                  width: size.width * scale,
                  height: Math.max(size.height, size.width * 1.25) * scale,
                }}
              >
                <article
                  ref={paper}
                  className={styles.paper}
                  aria-label="Sample receipt"
                  data-receipt-paper
                  style={{
                    width: size.width,
                    minHeight: size.width * 1.25,
                    transform: `scale(${scale})`,
                  }}
                >
                  <p className={styles.sample}>Sample receipt</p>
                  <h3>{expense.name}</h3>
                  <p className={styles.date}>{formatPickerDate(date)}</p>
                  <div className={styles.total}>
                    <span>Total</span>
                    <strong>{formatMoney(expense.amount, "USD")}</strong>
                  </div>
                </article>
              </div>
            </div>
          </div>
          <footer className={styles.footer}>
            <Dialog.Close asChild>
              <DesignButton>Back to expense</DesignButton>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
