const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const plural = new Intl.PluralRules("en");

/** "18 Nov 2026", from the API's timestamp. */
export function formatDate(iso: string): string {
  return day.format(new Date(iso));
}

/** "1 post", "14 posts". */
export function count(amount: number, singular: string): string {
  const word = plural.select(amount) === "one" ? singular : `${singular}s`;
  return `${amount} ${word}`;
}
