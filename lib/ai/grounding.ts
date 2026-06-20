/**
 * Grounding utilities — ensure LLM outputs only cite numbers that exist in the input data.
 *
 * Strategy: extract every numeric literal from a model output, check each one against a
 * whitelist of numbers derived from the source data (with light tolerance for rounding).
 * Sentences containing ungrounded numbers are either stripped or annotated.
 */

const NUMBER_RE = /(?<![A-Za-z_])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*%)?/g;

function parseNumber(token: string): number | null {
  const cleaned = token.replace(/,/g, '').replace(/%$/, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Collect every number that appears anywhere in the source payload. */
export function collectAllowedNumbers(source: unknown, bag = new Set<number>()): Set<number> {
  if (source == null) return bag;
  if (typeof source === 'number' && Number.isFinite(source)) {
    bag.add(source);
    bag.add(Math.round(source));
    return bag;
  }
  if (typeof source === 'string') {
    let m: RegExpExecArray | null;
    const re = new RegExp(NUMBER_RE);
    while ((m = re.exec(source)) != null) {
      const n = parseNumber(m[1]);
      if (n != null) {
        bag.add(n);
        bag.add(Math.round(n));
      }
    }
    return bag;
  }
  if (Array.isArray(source)) {
    for (const item of source) collectAllowedNumbers(item, bag);
    return bag;
  }
  if (typeof source === 'object') {
    for (const v of Object.values(source as Record<string, unknown>)) collectAllowedNumbers(v, bag);
  }
  return bag;
}

/**
 * Returns true if `value` is within `tolerance` of any number in `allowed`, OR if it's
 * a percentage in [0,100] (percents are derivable from raw counts and harder to whitelist).
 */
export function isGrounded(value: number, allowed: Set<number>, tolerance = 1): boolean {
  if (allowed.has(value) || allowed.has(Math.round(value))) return true;
  if (value >= 0 && value <= 100 && !Number.isInteger(value)) return true; // looks like a percent
  for (const a of allowed) {
    if (Math.abs(a - value) <= tolerance) return true;
  }
  return false;
}

/** Returns the input text with any sentence containing an ungrounded number removed. */
export function stripUngroundedSentences(text: string, allowed: Set<number>): string {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  for (const s of sentences) {
    const numbers = Array.from(s.matchAll(NUMBER_RE))
      .map((m) => parseNumber(m[1]))
      .filter((n): n is number => n != null);
    if (numbers.every((n) => isGrounded(n, allowed))) kept.push(s);
  }
  return kept.join(' ').trim();
}

/** Cleans an array of bullet strings, dropping any whose numbers can't be grounded. */
export function filterGroundedBullets(items: string[], allowed: Set<number>): string[] {
  return items.filter((item) => {
    const numbers = Array.from(String(item).matchAll(NUMBER_RE))
      .map((m) => parseNumber(m[1]))
      .filter((n): n is number => n != null);
    return numbers.every((n) => isGrounded(n, allowed));
  });
}
