export type Likeable = { like_count: number; liked_by_me: boolean };

/**
 * The thing as it will be once the reader's like is set to `liked`: what is
 * shown at once, before the API has answered. Setting it to what it already
 * is changes nothing, as the API's PUT and DELETE change nothing.
 */
export function withLike<T extends Likeable>(thing: T, liked: boolean): T {
  if (thing.liked_by_me === liked) return thing;
  return {
    ...thing,
    liked_by_me: liked,
    // The count can be behind (another tab unliked): never show less than none.
    like_count: Math.max(0, thing.like_count + (liked ? 1 : -1)),
  };
}
