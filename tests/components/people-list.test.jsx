import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PeopleList } from "@/app/screen2/people-list";

let resizeObservers;
beforeEach(() => {
  vi.useFakeTimers();
  resizeObservers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
        resizeObservers.push(this);
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback) =>
    setTimeout(callback, 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("preserves the reader's position for external updates and resets on reopening", () => {
  const content = (open, names) => (
    <PeopleList open={open} revealPersonId={null}>
      {names.map((name) => (
        <li key={name} data-person-id={name}>
          {name}
        </li>
      ))}
    </PeopleList>
  );
  const { rerender } = render(content(true, ["Nary", "Sokha", "Mali"]));
  const list = screen.getByRole("list", { name: "People" });
  list.scrollTop = 140;
  rerender(content(true, ["Nary", "Sokha", "Mali", "Dara"]));
  expect(list.scrollTop).toBe(140);
  rerender(content(true, ["Lina", "Nary", "Sokha", "Mali", "Dara"]));
  expect(list.scrollTop).toBe(140);
  rerender(content(false, ["Nary", "Sokha", "Mali", "Dara"]));
  rerender(content(true, ["Nary", "Sokha", "Mali", "Dara"]));
  expect(list.scrollTop).toBe(0);
});

it("shows the feather only when more than one pixel remains below the list", () => {
  render(
    <PeopleList open revealPersonId={null}>
      <li>Nary</li>
    </PeopleList>,
  );
  const list = screen.getByRole("list", { name: "People" });
  const edge = list.parentElement;
  Object.defineProperties(list, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 200 },
  });
  const measure = (top) => {
    list.scrollTop = top;
    fireEvent.scroll(list);
    act(() => vi.advanceTimersByTime(16));
  };
  measure(0);
  expect(edge).toHaveAttribute("data-more", "true");
  measure(99);
  expect(edge).toHaveAttribute("data-more", "false");
  measure(98.5);
  expect(edge).toHaveAttribute("data-more", "true");
  Object.defineProperty(list, "clientHeight", {
    configurable: true,
    value: 200,
  });
  resizeObservers[0].callback();
  act(() => vi.advanceTimersByTime(16));
  expect(edge).toHaveAttribute("data-more", "false");
});

it("updates after external content changes without moving the reader and cancels queued work on close", async () => {
  const content = (open, names) => (
    <PeopleList open={open} revealPersonId={null}>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </PeopleList>
  );
  const { rerender } = render(content(true, ["Nary"]));
  const list = screen.getByRole("list", { name: "People" });
  const edge = list.parentElement;
  Object.defineProperties(list, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 300 },
  });
  list.scrollTop = 140;
  await act(async () => rerender(content(true, ["Nary", "Dara"])));
  act(() => vi.advanceTimersByTime(16));
  expect(edge).toHaveAttribute("data-more", "true");
  expect(list.scrollTop).toBe(140);
  list.scrollTop = 200;
  fireEvent.scroll(list);
  rerender(content(false, ["Nary", "Dara"]));
  act(() => vi.advanceTimersByTime(16));
  expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce();
  expect(edge).toHaveAttribute("data-more", "true");
  rerender(content(true, ["Nary", "Dara"]));
  expect(list.scrollTop).toBe(0);
  expect(edge).toHaveAttribute("data-more", "true");
});
