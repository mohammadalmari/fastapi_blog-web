import type { ReactNode } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "@/api/errors";
import { postsReadPostQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { likesLikePost, likesUnlikePost } from "@/api/generated/sdk.gen";
import type { PostPublic } from "@/api/generated/types.gen";

import { useLikePost } from "./use-like";

// The API and the login check are stood in for, to decide when the API
// answers and what it says. Everything between a click and the cache is real.
vi.mock("@/api/generated/sdk.gen", () => ({
  likesLikePost: vi.fn(),
  likesUnlikePost: vi.fn(),
  likesLikeComment: vi.fn(),
  likesUnlikeComment: vi.fn(),
}));
const loggedIn = vi.hoisted(() => ({ value: true }));
vi.mock("@/features/auth/use-require-login", () => ({
  useRequireLogin: () => () => loggedIn.value,
}));

const like = vi.mocked(likesLikePost);
const unlike = vi.mocked(likesUnlikePost);

const post = {
  id: "665f1c2e8a4b3d0012345678",
  slug: "hello-a1b2c3",
  like_count: 3,
  liked_by_me: false,
} as PostPublic;
const key = postsReadPostQueryKey({ path: { slug: post.slug } });

/** A request the test answers by hand. */
function pending() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<never>((res, rej) => {
    resolve = res as () => void;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(start: PostPublic = post) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(key, start);
  const cached = () => queryClient.getQueryData<PostPublic>(key)!;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  // The component re-renders with the cached post, as the post page does.
  const hook = renderHook(() => useLikePost(cached()), { wrapper });
  return { hook, cached };
}

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn.value = true;
});

describe("useLikePost", () => {
  it("shows the like before the API has answered", async () => {
    const request = pending();
    like.mockReturnValue(request.promise);
    const { hook, cached } = setup();

    act(() => hook.result.current.toggle());

    await waitFor(() => expect(cached().liked_by_me).toBe(true));
    expect(cached().like_count).toBe(4);
    expect(like).toHaveBeenCalledWith(
      expect.objectContaining({ path: { post_id: post.id } })
    );
    request.resolve();
  });

  it("keeps the like once the API agrees", async () => {
    like.mockResolvedValue(undefined as never);
    const { hook, cached } = setup();

    act(() => hook.result.current.toggle());

    await waitFor(() => expect(like).toHaveBeenCalled());
    await waitFor(() => expect(hook.result.current.error).toBeNull());
    expect(cached()).toMatchObject({ liked_by_me: true, like_count: 4 });
  });

  it("takes the like back, and says why, when the API refuses", async () => {
    const refusal = new ApiError({ status: 429, message: "Too many requests" });
    like.mockRejectedValue(refusal);
    const { hook, cached } = setup();

    act(() => hook.result.current.toggle());

    await waitFor(() => expect(hook.result.current.error).toBe(refusal));
    expect(cached()).toMatchObject({ liked_by_me: false, like_count: 3 });
  });

  it("sends DELETE, not PUT, to take back a like already given", async () => {
    unlike.mockResolvedValue(undefined as never);
    const { hook, cached } = setup({
      ...post,
      liked_by_me: true,
      like_count: 4,
    });

    act(() => hook.result.current.toggle());

    await waitFor(() => expect(unlike).toHaveBeenCalledTimes(1));
    expect(like).not.toHaveBeenCalled();
    expect(cached()).toMatchObject({ liked_by_me: false, like_count: 3 });
  });

  it("ignores a second click until the first is answered", async () => {
    const request = pending();
    like.mockReturnValue(request.promise);
    const { hook, cached } = setup();

    act(() => hook.result.current.toggle());
    await waitFor(() => expect(cached().liked_by_me).toBe(true));
    act(() => hook.result.current.toggle());
    act(() => hook.result.current.toggle());

    expect(like).toHaveBeenCalledTimes(1);
    expect(unlike).not.toHaveBeenCalled();
    request.resolve();
  });

  it("asks a visitor to log in and sends nothing", () => {
    loggedIn.value = false;
    const { hook, cached } = setup();

    act(() => hook.result.current.toggle());

    expect(like).not.toHaveBeenCalled();
    expect(cached()).toMatchObject({ liked_by_me: false, like_count: 3 });
  });
});
