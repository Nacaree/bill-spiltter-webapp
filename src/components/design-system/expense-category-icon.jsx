"use client";

import { useEffect, useRef, useState } from "react";
import { getExpenseCategory } from "./expense-categories";
import { useDesignReducedMotion } from "./use-design-reduced-motion";

export function ExpenseCategoryIcon({ category, name, size = 20, className }) {
  const root = useRef(null);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useDesignReducedMotion();
  const { Icon, icon } = getExpenseCategory(category, name);

  useEffect(() => {
    const symbol = root.current;
    const button = symbol?.closest("button");
    if (!button || reducedMotion !== false) return;
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let visible = false;
    let frame;
    const available = () =>
      visible &&
      !document.hidden &&
      !forcedColors.matches &&
      !document.body.hasAttribute("data-scroll-locked");
    function stop() {
      cancelAnimationFrame(frame);
      setPlaying(false);
    }
    function replay() {
      stop();
      if (!available()) return;
      // Replay without replacing the SVG beneath a finger or mouse pointer.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPlaying(true));
      });
    }
    function enter(event) {
      if (event.pointerType !== "touch") replay();
    }
    function press(event) {
      if (event.button === 0) replay();
    }
    function key(event) {
      if (!event.repeat && (event.key === "Enter" || event.key === " "))
        replay();
    }
    function pause() {
      if (!available()) stop();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) replay();
      else stop();
    });
    observer.observe(symbol);
    const dialogs = new MutationObserver(pause);
    dialogs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
    });
    button.addEventListener("pointerenter", enter);
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("focus", replay);
    button.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", pause);
    forcedColors.addEventListener("change", pause);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      dialogs.disconnect();
      button.removeEventListener("pointerenter", enter);
      button.removeEventListener("pointerdown", press);
      button.removeEventListener("pointercancel", stop);
      button.removeEventListener("focus", replay);
      button.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", pause);
      forcedColors.removeEventListener("change", pause);
    };
  }, [reducedMotion, icon]);

  return (
    <span
      ref={root}
      className={className}
      aria-hidden="true"
      data-expense-icon={icon}
      data-icon-playing={playing && reducedMotion === false}
    >
      <Icon size={size} animate={playing && reducedMotion === false} />
    </span>
  );
}
