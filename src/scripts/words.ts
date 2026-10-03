/**
 * Splits a string into word spans for a per-word entrance.
 *
 * The hero already does this inline; this exists so the same stagger can be
 * applied to section headings without repeating the markup in five templates.
 * Runs at build time, so it costs nothing at runtime.
 */
export function splitWords(text: string): { word: string; i: number }[] {
  return text
    .split(' ')
    .filter(Boolean)
    .map((word, i) => ({ word, i }));
}
