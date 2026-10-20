import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RetainedForm } from "@/components/retained-form";
afterEach(cleanup);
it("restores text, selects and checkboxes after React resets a blocked form", async () => {
  const contents = (
    <>
      <input aria-label="Description" name="description" defaultValue="" />
      <select aria-label="Currency" name="currency" defaultValue="USD">
        <option>USD</option>
        <option>KHR</option>
      </select>
      <input aria-label="Person" name="person" type="checkbox" value="owner" />
      <button type="submit">Save</button>
    </>
  );
  const { rerender, container } = render(
    <RetainedForm state={{}} onSubmit={(e) => e.preventDefault()}>
      {contents}
    </RetainedForm>,
  );
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Dinner" },
  });
  fireEvent.change(screen.getByLabelText("Currency"), {
    target: { value: "KHR" },
  });
  fireEvent.click(screen.getByLabelText("Person"));
  fireEvent.submit(container.querySelector("form"));
  container.querySelector("form").reset();
  rerender(
    <RetainedForm
      state={{ code: "rate_limited" }}
      onSubmit={(e) => e.preventDefault()}
    >
      {contents}
    </RetainedForm>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Description")).toHaveValue("Dinner"),
  );
  expect(screen.getByLabelText("Currency")).toHaveValue("KHR");
  expect(screen.getByLabelText("Person")).toBeChecked();
});
it("keeps normal successful reset behavior", () => {
  const { container } = render(
    <RetainedForm state={{ success: true }}>
      <input aria-label="Name" name="name" defaultValue="" />
    </RetainedForm>,
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Owner" },
  });
  container.querySelector("form").reset();
  expect(screen.getByLabelText("Name")).toHaveValue("");
});
