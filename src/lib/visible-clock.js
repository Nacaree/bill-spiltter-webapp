"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set();
let snapshot = null;
let timer = null;

function publish() {
  snapshot = Date.now();
  listeners.forEach((listener) => listener());
}

function updateVisibility() {
  clearInterval(timer);
  timer = null;
  if (!document.hidden) {
    publish();
    timer = setInterval(publish, 60_000);
  }
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = null;
      snapshot = null;
      document.removeEventListener("visibilitychange", updateVisibility);
    }
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

// Local activity writes/resets can occur between minute ticks.
export function refreshVisibleClock() {
  if (listeners.size && !document.hidden) publish();
}

// Every timestamp shares one timer. The server/hydration snapshot is always null.
export function useVisibleClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
