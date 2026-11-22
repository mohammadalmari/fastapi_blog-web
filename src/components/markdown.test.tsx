import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { hasCode, Markdown } from "./markdown";

const show = (source: string) => render(<Markdown>{source}</Markdown>);

describe("Markdown", () => {
  it("renders the usual things: headings, emphasis, lists, links", () => {
    show("## Title\n\nSome *words* and a [link](/tags).\n\n- one\n- two");

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("words").tagName).toBe("EM");
    expect(screen.getByRole("link", { name: "link" })).toHaveAttribute(
      "href",
      "/tags"
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("starts headings one level below the page's title", () => {
    show("# Top\n\n## Next");

    expect(
      screen.getByRole("heading", { level: 2, name: "Top" })
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 3, name: "Next" })
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders tables and marks code with its language", () => {
    const { container } = show(
      "| a | b |\n| - | - |\n| 1 | 2 |\n\n```python\nprint('hi')\n```"
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(container.querySelector("pre code.language-python")).not.toBeNull();
  });

  it("highlights code once the highlighter has arrived", async () => {
    const { container } = show("```python\nprint('hi')\n```");

    await waitFor(() =>
      expect(container.querySelector(".hljs-string")).not.toBeNull()
    );
  });

  it.each([
    ["a fenced block", "Text.\n\n```\ncode\n```", true],
    ["a tilde fence", "~~~js\nx\n~~~", true],
    ["an indented block", "Text.\n\n    indented code", true],
    ["inline code only", "Use `x` here.", false],
    ["plain prose", "Just words.\n\nMore words.", false],
  ])(
    "knows whether there is code to highlight: %s",
    (_name, source, expected) => {
      expect(hasCode(source)).toBe(expected);
    }
  );

  it("lets each paragraph find its own direction", () => {
    show("Hello\n\nمرحبا");

    expect(screen.getByText("مرحبا")).toHaveAttribute("dir", "auto");
  });

  it("marks a link to another site as a user's, and tells that site nothing", () => {
    show("[out](https://example.com) and [in](/tags)");

    expect(screen.getByRole("link", { name: "out" })).toHaveAttribute(
      "rel",
      "ugc nofollow noopener noreferrer"
    );
    expect(screen.getByRole("link", { name: "in" })).not.toHaveAttribute("rel");
  });

  // Written from the attacker's side: each of these is something a post's
  // author could type hoping it runs in a reader's browser.
  describe("with hostile input", () => {
    it("builds nothing from HTML, and keeps only its plain text", () => {
      const { container } = show(
        [
          "<script>window.pwned = 1</script>",
          "",
          '<img src="x" onerror="window.pwned = 1">',
          "",
          '<iframe src="https://evil.example"></iframe>',
          "",
          '<a href="/x" onclick="window.pwned = 1">click</a>',
          "",
          "<style>body { display: none }</style>",
          "",
          '<form action="https://evil.example"><input name="password"></form>',
        ].join("\n")
      );

      expect(
        container.querySelector("script, img, iframe, style, form, input, a")
      ).toBeNull();
      expect(container.textContent).not.toMatch(/pwned|evil|display/);
      expect(container.textContent).toContain("click");
    });

    it.each([
      ["javascript:", "[x](javascript:alert(1))"],
      ["javascript: in mixed case", "[x](JaVaScRiPt:alert(1))"],
      ["vbscript:", "[x](vbscript:msgbox(1))"],
      ["data:", "[x](data:text/html,<script>alert(1)</script>)"],
    ])("drops the address of a %s link", (_name, source) => {
      const { container } = show(source);

      for (const link of container.querySelectorAll("a")) {
        expect(link.getAttribute("href") ?? "").not.toMatch(/script:|^data:/i);
      }
    });

    it("drops the address of a javascript: image", () => {
      const { container } = show("![x](javascript:alert(1))");

      const image = container.querySelector("img");
      expect(image?.getAttribute("src") ?? "").not.toMatch(/script:/i);
    });

    it("carries no event handlers or inline styles on anything it builds", () => {
      const { container } = show(
        '[x](/a "t" onmouseover=alert(1))\n\n![y](/b.png){onerror=alert(1)}\n\n**bold**{style="position:fixed"}'
      );

      for (const element of container.querySelectorAll("*")) {
        for (const attribute of element.getAttributeNames()) {
          expect(attribute).not.toMatch(/^on|^style$/i);
        }
      }
    });

    it("asks an image's host for it without saying which page shows it", () => {
      const { container } = show("![cat](https://example.com/cat.png)");

      const image = container.querySelector("img")!;
      expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("alt", "cat");
    });
  });
});
