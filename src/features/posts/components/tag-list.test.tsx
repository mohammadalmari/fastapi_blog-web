import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { TagList } from "./tag-list";

describe("TagList", () => {
  it("lists every tag with its number of posts, in the order given", () => {
    const tags = [
      { name: "python", count: 14 },
      { name: "c++", count: 1 },
    ];

    render(<TagList tags={tags} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("python")).toBeInTheDocument();
    expect(within(items[0]).getByText("14 posts")).toBeInTheDocument();
    expect(within(items[1]).getByText("1 post")).toBeInTheDocument();
  });

  it("shows a tag's text as text, never as markup", () => {
    const tags = [{ name: "<img src=x onerror=alert(1)>", count: 2 }];

    render(<TagList tags={tags} />);

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  it("says so when there are no tags", () => {
    render(<TagList tags={[]} />);

    expect(screen.getByText("No tags yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
