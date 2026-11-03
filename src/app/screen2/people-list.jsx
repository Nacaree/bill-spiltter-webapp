"use client";

import { useLayoutEffect, useRef } from "react";
import { motionTiming } from "@/components/design-system/motion-tokens";
import styles from "./mobile-bill.module.css";

// Only a local submission requests scrolling. Changes to children alone keep
// the reader's position, including future updates from other participants.
export function PeopleList({ children, open, revealPersonId }) {
  const list = useRef(null);
  const viewport = useRef(null);
  const lastRequest = useRef(revealPersonId);

  useLayoutEffect(() => {
    if (open) list.current.scrollTop = 0;
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const container = list.current;
    const edge = viewport.current;
    const rows = new Set();
    let frame;

    function measure() {
      frame = undefined;
      edge.setAttribute(
        "data-more",
        String(
          container.scrollHeight -
            container.clientHeight -
            container.scrollTop >
            1,
        ),
      );
    }
    function schedule() {
      if (frame === undefined) frame = requestAnimationFrame(measure);
    }
    const resize = new ResizeObserver(schedule);
    function observeRows() {
      const current = new Set(container.children);
      for (const row of rows) {
        if (!current.has(row)) {
          resize.unobserve(row);
          rows.delete(row);
        }
      }
      for (const row of current) {
        if (!rows.has(row)) {
          rows.add(row);
          resize.observe(row);
        }
      }
    }
    const mutation = new MutationObserver(() => {
      observeRows();
      schedule();
    });
    resize.observe(container);
    observeRows();
    mutation.observe(container, { childList: true });
    container.addEventListener("scroll", schedule, { passive: true });
    // Measure before paint as well as after row/viewport changes.
    measure();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      container.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !revealPersonId || lastRequest.current === revealPersonId)
      return;
    lastRequest.current = revealPersonId;
    const container = list.current;
    const row = Array.from(container.children).find(
      (item) => item.dataset.personId === revealPersonId,
    );
    if (!row) return;

    const scroll = container.closest('[data-overflow-layout="flow"]')
      ? container.closest("[data-panel-scroll]")
      : container;
    let timer;
    let frame;
    let stopped = false;
    function reveal() {
      if (stopped) return;
      const bounds = scroll.getBoundingClientRect();
      const target = row.getBoundingClientRect();
      if (target.bottom > bounds.bottom)
        scroll.scrollBy({
          top: target.bottom - bounds.bottom,
          behavior: "instant",
        });
      // In the short-viewport fallback, retain the focused composer rather than
      // moving it out of view to display a newly added name.
      if (scroll !== container) {
        const focused = document.activeElement;
        if (scroll.contains(focused)) {
          const input = focused.getBoundingClientRect();
          if (input.bottom > bounds.bottom - 8)
            scroll.scrollBy({
              top: input.bottom - bounds.bottom + 8,
              behavior: "instant",
            });
        }
      }
    }
    const observer = new ResizeObserver(reveal);
    function stop() {
      stopped = true;
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    }
    function finish() {
      reveal();
      stop();
    }
    observer.observe(row);
    observer.observe(scroll);
    scroll.addEventListener("wheel", stop, { passive: true });
    scroll.addEventListener("touchstart", stop, { passive: true });
    scroll.addEventListener("pointerdown", stop);
    reveal();
    frame = requestAnimationFrame(reveal);
    timer = setTimeout(finish, motionTiming.reveal * 1000 + 80);
    return () => {
      stop();
      scroll.removeEventListener("wheel", stop);
      scroll.removeEventListener("touchstart", stop);
      scroll.removeEventListener("pointerdown", stop);
    };
  }, [open, revealPersonId]);

  return (
    <div
      ref={viewport}
      className={styles.peopleListViewport}
      data-panel-list-viewport
    >
      <ul
        ref={list}
        className={styles.peopleList}
        data-panel-list
        aria-label="People"
        tabIndex={0}
      >
        {children}
      </ul>
      <span
        className={styles.peopleFeather}
        data-panel-list-feather
        aria-hidden="true"
      />
    </div>
  );
}
