import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import { renderWithRouter } from "@/test/render";

import { TagList } from "./tag-list";

describe("TagList", () => {
  it("lists every tag with its number of posts, in the order given", async () => {
    const tags = [
      { name: "python", count: 14 },
      { name: "c++", count: 1 },
    ];

    await renderWithRouter(<TagList tags={tags} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("python")).toBeInTheDocument();
    expect(within(items[0]).getByText("14 posts")).toBeInTheDocument();
    expect(within(items[1]).getByText("1 post")).toBeInTheDocument();
  });

  it("links each tag to the posts that carry it, whatever characters it has", async () => {
    await renderWithRouter(<TagList tags={[{ name: "c++", count: 1 }]} />);

    const link = screen.getByRole("link", { name: "c++" });
    const address = new URL(link.getAttribute("href")!, "http://localhost");
    expect(address.pathname).toBe("/");
    expect(address.searchParams.get("tag")).toBe("c++");
  });

  it("shows a tag's text as text, never as markup", async () => {
    const tags = [{ name: "<img src=x onerror=alert(1)>", count: 2 }];

    await renderWithRouter(<TagList tags={tags} />);

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  it("says so when there are no tags", async () => {
    await renderWithRouter(<TagList tags={[]} />);

    expect(screen.getByText("No tags yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
