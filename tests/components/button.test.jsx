import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders an accessible button", () => {
    render(<Button>Create bill</Button>);
    expect(screen.getByRole("button", { name: "Create bill" })).toBeEnabled();
  });

  it("keeps the pointer target mounted and replays the icon after activation", () => {
    window.matchMedia.mockImplementation((media) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const onClick = vi.fn();
    render(
      <Button icon="check" onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    const iconBeforePress = button.querySelector("svg");

    fireEvent.pointerDown(button, { button: 0, pointerType: "touch" });

    expect(button.querySelector("svg")).toBe(iconBeforePress);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.querySelector("svg")).not.toBe(iconBeforePress);
  });
});
