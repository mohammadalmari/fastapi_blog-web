import type { ComponentProps } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

// Markdown here is written by users and stored as written, so it is
// untrusted. Three things keep it inert:
//
// 1. HTML inside it is never parsed as HTML (no rehype-raw), and the
//    sanitizer drops it: a <script> tag builds nothing and shows nothing.
//    Only the plain text between inline tags survives.
// 2. react-markdown drops link and image addresses with a scheme other
//    than http, https, mailto and the like, so no `javascript:` links.
// 3. rehype-sanitize then strips anything not on GitHub's allow-list, in
//    case a later plugin or option lets something through.
//
// Highlighting runs after sanitizing: its output is ours, and the sanitizer
// would strip the classes it adds.
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSanitize, rehypeHighlight];

// The page's title is the only h1, so headings inside a post start one
// level down.
const components: Components = {
  h1: ({ node, ...props }) => <h2 dir="auto" {...props} />,
  h2: ({ node, ...props }) => <h3 dir="auto" {...props} />,
  h3: ({ node, ...props }) => <h4 dir="auto" {...props} />,
  h4: ({ node, ...props }) => <h5 dir="auto" {...props} />,
  // Each block finds its own direction, so a post can mix scripts.
  p: ({ node, ...props }) => <p dir="auto" {...props} />,
  li: ({ node, ...props }) => <li dir="auto" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote dir="auto" {...props} />,
  a: ({ node, ...props }) => <MarkdownLink {...props} />,
  // An image is fetched from wherever the author pointed: don't tell that
  // host which page it was shown on, and don't fetch it before it is near.
  img: ({ node, ...props }) => (
    <img loading="lazy" referrerPolicy="no-referrer" alt="" {...props} />
  ),
  // A wide table scrolls inside its own box instead of the page.
  table: ({ node, ...props }) => (
    <div className="markdown-table">
      <table {...props} />
    </div>
  ),
};

function MarkdownLink({ href, ...props }: ComponentProps<"a">) {
  const external = href !== undefined && /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      // "ugc nofollow": the link is a user's, not the site's endorsement.
      // "noopener noreferrer": the other site learns nothing about this one.
      rel={external ? "ugc nofollow noopener noreferrer" : undefined}
      {...props}
    />
  );
}

/** A user's Markdown, rendered safely. Styled by `.markdown` in index.css. */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
