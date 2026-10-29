import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScreensPage from "@/app/screens/page";

describe("ScreensPage", () => {
  it("lets a person switch journeys, join, and reach their overview", () => {
    render(<ScreensPage />);

    expect(
      screen.getByRole("heading", { name: "Weekend dinner" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open prototype menu, currently Bill owner",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Settler" }));
    expect(
      screen.getByRole("heading", { name: "Join this bill" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add me instead" }));
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Dara" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join bill" }));

    expect(screen.getByText("You’re joining as Dara")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You joined the sample bill as Dara.",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open prototype menu, currently Settler",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Shared journeys" }));

    expect(
      screen.getByRole("heading", { name: "Add an expense" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Paid by")).toBeEnabled();
  });
});
