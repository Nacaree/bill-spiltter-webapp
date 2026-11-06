"use client";

import { useEffect, useRef } from "react";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import { mobileSearchTiming } from "./motion-tokens";
import styles from "./expense-search-mobile-effect.module.css";

export const mobileSearchEffects = ["ripple", "press", "underline", "draw"];

export function ExpenseSearchMobileEffect({
  effect,
  drawOnPress = false,
  onIconPlay,
  onIconStop,
}) {
  const root = useRef(null);
  const reducedMotion = useDesignReducedMotion();

  useEffect(() => {
    const layer = root.current;
    const field = layer?.parentElement;
    if (!field || reducedMotion !== false) return;
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let visible = false;
    let focused = field.contains(document.activeElement);
    let pressed = false;
    let animations = [];
    let pendingGesture = null;
    const available = () =>
      visible &&
      !document.hidden &&
      !forcedColors.matches &&
      !document.body.hasAttribute("data-scroll-locked");
    function cancelSurface() {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    }
    function cancel() {
      cancelSurface();
      onIconStop?.();
    }
    function update() {
      const active = available() && (focused || pressed);
      layer.dataset.active = String(active);
      layer.dataset.motion = active ? "running" : "paused";
      if (!active) cancel();
      else if (pendingGesture) {
        const gesture = pendingGesture;
        pendingGesture = null;
        play(...gesture);
      }
    }
    function play(x, y, keyboard = false) {
      if (!available()) {
        pendingGesture = [x, y, keyboard];
        return;
      }
      pendingGesture = null;
      cancel();
      const surface = layer.firstElementChild;
      if (effect === "ripple") {
        const bounds = field.getBoundingClientRect();
        const localX = x ?? bounds.width / 2;
        const localY = y ?? bounds.height / 2;
        const diameter =
          2 *
          Math.hypot(
            Math.max(localX, bounds.width - localX),
            Math.max(localY, bounds.height - localY),
          );
        layer.style.setProperty("--touch-x", `${localX}px`);
        layer.style.setProperty("--touch-y", `${localY}px`);
        layer.style.setProperty("--ripple-size", `${diameter}px`);
        animations.push(
          surface.animate(
            [
              { transform: "translate(-50%, -50%) scale(0)", opacity: 0.32 },
              { opacity: 0.18, offset: 0.5 },
              { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
            ],
            { duration: mobileSearchTiming.ripple, easing: "ease-out" },
          ),
        );
      } else if (effect === "press") {
        animations.push(
          surface.animate(
            keyboard
              ? [
                  { transform: "translateY(0)", opacity: 0 },
                  { transform: "translateY(1px)", opacity: 1, offset: 0.3 },
                  {
                    transform: "translateY(-0.5px)",
                    opacity: 0.4,
                    offset: 0.7,
                  },
                  { transform: "translateY(0)", opacity: 0 },
                ]
              : [
                  { transform: "translateY(0)", opacity: 0 },
                  { transform: "translateY(1px)", opacity: 1 },
                ],
            {
              duration: keyboard
                ? mobileSearchTiming.release
                : mobileSearchTiming.press,
              fill: "forwards",
              easing: "ease-out",
            },
          ),
        );
      }
      if (effect === "draw" || drawOnPress) onIconPlay?.();
    }
    function focusIn() {
      const entering = !focused;
      focused = true;
      update();
      const clearing = field
        .querySelector("input")
        ?.hasAttribute("data-search-clear-focus");
      if (entering && !pressed && !clearing) play(undefined, undefined, true);
    }
    function focusOut(event) {
      if (field.contains(event.relatedTarget)) return;
      focused = false;
      pendingGesture = null;
      update();
    }
    function down(event) {
      if (event.button !== 0 || event.target.closest("button")) return;
      pressed = true;
      update();
      const bounds = field.getBoundingClientRect();
      if (effect !== "draw" || !focused)
        play(event.clientX - bounds.left, event.clientY - bounds.top);
    }
    function release(event) {
      if (!pressed) return;
      pressed = false;
      if (event.type === "pointercancel") {
        pendingGesture = null;
        cancel();
        update();
        return;
      }
      if (effect === "press" && !available())
        pendingGesture = [undefined, undefined, true];
      if (effect === "press" && available()) {
        const surface = layer.firstElementChild;
        const current = getComputedStyle(surface).transform;
        cancelSurface();
        animations.push(
          surface.animate(
            [
              { transform: current, opacity: 1 },
              { transform: "translateY(-0.5px)", opacity: 0.4, offset: 0.55 },
              { transform: "translateY(0)", opacity: 0 },
            ],
            { duration: mobileSearchTiming.release, easing: "ease-out" },
          ),
        );
      }
      update();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(field);
    const dialogs = new MutationObserver(update);
    dialogs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
    });
    field.addEventListener("focusin", focusIn);
    field.addEventListener("focusout", focusOut);
    field.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    document.addEventListener("visibilitychange", update);
    forcedColors.addEventListener("change", update);
    update();
    return () => {
      cancel();
      observer.disconnect();
      dialogs.disconnect();
      field.removeEventListener("focusin", focusIn);
      field.removeEventListener("focusout", focusOut);
      field.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.removeEventListener("visibilitychange", update);
      forcedColors.removeEventListener("change", update);
      layer.dataset.active = "false";
      layer.dataset.motion = "still";
    };
  }, [effect, drawOnPress, reducedMotion, onIconPlay, onIconStop]);

  return (
    <span
      ref={root}
      className={styles.effect}
      data-mobile-effect={effect}
      data-active="false"
      data-motion="still"
      aria-hidden="true"
    >
      <span className={styles.surface} />
    </span>
  );
}
