import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityTime } from "@/components/ui/activity-time";
import { refreshVisibleClock, useVisibleClock } from "@/lib/visible-clock";

const now = Date.parse("2026-10-29T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.hidden;
});

describe("shared visible clock", () => {
  it("refreshes immediately for local writes without starting another timer", () => {
    const { result } = renderHook(() => useVisibleClock());
    vi.setSystemTime(now + 30_000);
    act(() => refreshVisibleClock());
    expect(result.current).toBe(now + 30_000);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("shares one minute timer, preserves subscribers, and releases it when unused", () => {
    const first = renderHook(() => useVisibleClock());
    const second = renderHook(() => useVisibleClock());
    expect(first.result.current).toBe(now);
    expect(second.result.current).toBe(now);
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(59_999));
    expect(first.result.current).toBe(now);
    act(() => vi.advanceTimersByTime(1));
    expect(first.result.current).toBe(now + 60_000);
    expect(second.result.current).toBe(now + 60_000);
    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(now + 5 * 60_000);
    const reopened = renderHook(() => useVisibleClock());
    expect(reopened.result.current).toBe(now + 5 * 60_000);
  });

  it("stops in hidden tabs and immediately resynchronizes on return", () => {
    const { result } = renderHook(() => useVisibleClock());
    act(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(result.current).toBe(now);
    act(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(now + 10 * 60_000);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("does not start a timer until an initially hidden tab becomes visible", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    const { result } = renderHook(() => useVisibleClock());
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(now);
  });
});

it("renders a stable noninteractive server placeholder and no timer", () => {
  const html = renderToString(
    <ActivityTime createdAt="2026-10-29T11:55:00Z" />,
  );
  expect(html).toContain("—");
  expect(html).not.toContain("<button");
  expect(html).not.toContain("datetime=");
  expect(vi.getTimerCount()).toBe(0);
});

it("updates elapsed labels without live announcements, and never changes the event time", () => {
  const { container } = render(
    <ActivityTime createdAt="2026-10-29T11:55:00Z" />,
  );
  const time = container.querySelector("time");
  expect(time).toHaveTextContent("5 min ago");
  expect(time).toHaveAttribute("datetime", "2026-10-29T11:55:00.000Z");
  act(() => vi.advanceTimersByTime(60_000));
  expect(time).toHaveTextContent("6 min ago");
  expect(time).toHaveAttribute("datetime", "2026-10-29T11:55:00.000Z");
  expect(container.querySelector("[aria-live]")).toBeNull();
});

it("opens the exact time on activation and toggles closed", async () => {
  render(<ActivityTime createdAt="2026-10-29T11:55:00Z" />);
  const button = screen.getByRole("button", {
    name: "5 min ago, show exact date and time",
  });
  await act(async () => fireEvent.click(button));
  const dialog = screen.getByRole("dialog", { name: "Exact activity time" });
  expect(dialog).toHaveTextContent("29 Oct 2026");
  expect(dialog.querySelector("time")).toHaveAttribute(
    "datetime",
    "2026-10-29T11:55:00.000Z",
  );
  await act(async () => fireEvent.click(button));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps invalid times noninteractive", () => {
  render(<ActivityTime createdAt="invalid" />);
  expect(screen.getByLabelText("Activity time unavailable")).toHaveTextContent(
    "—",
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
