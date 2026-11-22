import { useState } from "react";

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TagInput } from "./tag-input";

function Harness({ start = [] as string[] }) {
  const [tags, setTags] = useState(start);
  return (
    <>
      <label htmlFor="tags">Tags</label>
      <TagInput id="tags" value={tags} onChange={setTags} />
      <output>{tags.join("|")}</output>
    </>
  );
}

const box = () => screen.getByLabelText("Tags");
const stored = () => screen.getByRole("status").textContent;

describe("TagInput", () => {
  it("adds what was typed on Enter, as it will be stored", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), "Mongo DB{Enter}");

    expect(stored()).toBe("mongo-db");
    expect(box()).toHaveValue("");
  });

  it("adds on a comma too, and on leaving the box", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), "python,fastapi");
    await user.tab();

    expect(stored()).toBe("python|fastapi");
  });

  it("refuses a tag the API would refuse, says why, and keeps the text to fix", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), "a/b{Enter}");

    expect(stored()).toBe("");
    expect(screen.getByRole("alert")).toHaveTextContent(/may contain/);
    expect(box()).toHaveValue("a/b");
    expect(box()).toHaveAttribute("aria-invalid", "true");
  });

  it("doesn't add the same tag twice", async () => {
    const user = userEvent.setup();
    render(<Harness start={["python"]} />);

    await user.type(box(), "Python{Enter}");

    expect(stored()).toBe("python");
  });

  it("removes a tag by its button, and the last one with Backspace", async () => {
    const user = userEvent.setup();
    render(<Harness start={["a1", "b2", "c3"]} />);

    await user.click(screen.getByRole("button", { name: "Remove tag a1" }));
    await user.click(box());
    await user.keyboard("{Backspace}");

    expect(stored()).toBe("b2");
  });

  it("takes no more once the post has ten", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
    render(<Harness start={ten} />);

    expect(box()).toBeDisabled();
    expect(screen.getByText(/10 of 10/)).toBeInTheDocument();
  });
});
