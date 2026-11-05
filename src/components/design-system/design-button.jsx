"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useDesignReducedMotion } from "./use-design-reduced-motion";
import { Plus } from "./icons/animate-ui/plus";
import { PencilLine } from "./icons/animate-ui/pencil-line";
import { Upload } from "./icons/animate-ui/upload";
import { Copy } from "./icons/animate-ui/copy";
import { Check } from "./icons/animate-ui/check";
import { ArrowRight } from "./icons/animate-ui/arrow-right";
import { X } from "./icons/animate-ui/x";
import { RotateCcw } from "./icons/animate-ui/rotate-ccw";
import { House } from "./icons/animate-ui/house";
import { Wallet } from "./icons/animate-ui/wallet";
import { Users } from "./icons/animate-ui/users";
import { Ellipsis } from "./icons/animate-ui/ellipsis";
import styles from "./system.module.css";

const icons = {
  plus: Plus,
  pencil: PencilLine,
  upload: Upload,
  copy: Copy,
  check: Check,
  arrow: ArrowRight,
  close: X,
  replay: RotateCcw,
  home: House,
  wallet: Wallet,
  people: Users,
  menu: Ellipsis,
};

export function DesignButton({
  variant = "primary",
  className,
  type = "button",
  icon,
  iconPosition = "start",
  iconAnimate = false,
  children,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerCancel,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}) {
  const reducedMotion = useDesignReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [pressCycle, setPressCycle] = useState(0);
  const pressTimer = useRef(null);
  const Icon = icons[icon];

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  function replayIcon(restart = true) {
    if (!Icon || props.disabled || reducedMotion !== false) return;
    clearTimeout(pressTimer.current);
    setPressed(true);
    if (restart) setPressCycle((cycle) => cycle + 1);
    pressTimer.current = setTimeout(() => setPressed(false), 650);
  }

  function handleClick(event) {
    replayIcon();
    onClick?.(event);
  }

  const iconElement = Icon ? (
    <span
      className={styles.buttonIcon}
      aria-hidden="true"
      data-icon-library="animate-ui"
      data-icon={icon}
    >
      <Icon
        key={`${icon}-${pressCycle}-${reducedMotion === false ? "motion" : "still"}`}
        size={18}
        animation={icon === "copy" ? "merge-loop" : undefined}
        animate={
          reducedMotion === false &&
          !props.disabled &&
          (hovered || focused || pressed || iconAnimate)
        }
      />
    </span>
  ) : null;

  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant === "destructive" ? "dangerButton" : variant],
        className,
      )}
      {...props}
      data-button-feedback="soft"
      onClick={handleClick}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") {
          setHovered(true);
          // A focused button may still be in its animated state. Remount these
          // gestures to replay the library preset on every fresh pointer entry.
          if (
            (icon === "copy" || icon === "pencil") &&
            !props.disabled &&
            reducedMotion === false
          ) {
            setPressCycle((cycle) => cycle + 1);
          }
        }
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onPointerDown={(event) => {
        if (event.button === 0 || event.pointerType === "touch") {
          // Keep the pressed SVG mounted until click, so taps on the icon
          // retain their original event target through pointerup.
          replayIcon(false);
        }
        onPointerDown?.(event);
      }}
      onPointerCancel={(event) => {
        clearTimeout(pressTimer.current);
        setPressed(false);
        onPointerCancel?.(event);
      }}
      onKeyDown={(event) => {
        if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
          replayIcon(false);
        }
        onKeyDown?.(event);
      }}
    >
      {typeof children === "function" ? (
        children(iconElement)
      ) : (
        <>
          {iconPosition !== "end" && iconElement}
          {children}
          {iconPosition === "end" && iconElement}
        </>
      )}
    </button>
  );
}
