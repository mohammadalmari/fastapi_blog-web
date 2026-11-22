import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import type { PostSummary } from "@/api/generated/types.gen";
import { renderWithRouter } from "@/test/render";

import { PostListItem } from "./post-list-item";

function post(changes: Partial<PostSummary> = {}): PostSummary {
  return {
    id: "665f1c2e8a4b3d0012345678",
    slug: "hello-world-a1b2c3",
    title: "Hello, world",
    excerpt: "A first post.",
    tags: ["python"],
    status: "published",
    published_at: "2026-11-18T09:00:00Z",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-18T09:00:00Z",
    like_count: 24,
    liked_by_me: false,
    comment_count: 1,
    author: {
      id: "665f1c2e8a4b3d0012345679",
      username: "sami",
      display_name: null,
      avatar_url: null,
    },
    ...changes,
  };
}

describe("PostListItem", () => {
  it("links the title to the post and the author to their profile", async () => {
    await renderWithRouter(<PostListItem post={post()} />);

    expect(screen.getByRole("link", { name: "Hello, world" })).toHaveAttribute(
      "href",
      "/posts/hello-world-a1b2c3"
    );
    expect(screen.getByRole("link", { name: "sami" })).toHaveAttribute(
      "href",
      "/users/sami"
    );
  });

  it("dates the post by when it was published, not written", async () => {
    await renderWithRouter(<PostListItem post={post()} />);

    expect(screen.getByText("18 Nov 2026")).toBeInTheDocument();
  });

  it("counts likes and comments in words", async () => {
    await renderWithRouter(<PostListItem post={post()} />);

    expect(screen.getByText("24 likes")).toBeInTheDocument();
    expect(screen.getByText("1 comment")).toBeInTheDocument();
  });

  it("prefers the name an author chose over their username", async () => {
    const author = { ...post().author!, display_name: "Sami H." };

    await renderWithRouter(<PostListItem post={post({ author })} />);

    expect(screen.getByRole("link", { name: "Sami H." })).toHaveAttribute(
      "href",
      "/users/sami"
    );
  });

  it("says so, with no link, when the author's account is gone", async () => {
    await renderWithRouter(<PostListItem post={post({ author: null })} />);

    expect(screen.getByText("Deleted account")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /account/i })).toBeNull();
  });

  it("shows a hostile title and excerpt as text", async () => {
    const hostile = post({
      title: "<script>alert(1)</script>",
      excerpt: "<img src=x onerror=alert(2)>",
    });

    await renderWithRouter(<PostListItem post={hostile} />);

    expect(screen.getByText("<script>alert(1)</script>")).toBeVisible();
    expect(document.querySelector("script, img")).toBeNull();
  });
});
