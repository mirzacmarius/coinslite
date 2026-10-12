/**
 * Whether the Overview greets a new collector with the start card: true when
 * the Collection holds no Items, owned or sold, false once it holds any, and
 * undefined until that's known, so neither the start card nor the shortcuts
 * appear and then vanish. Someone who has sold everything isn't starting
 * over: they still see what they realised.
 */
export function isFirstRun(
  /** How many latest Items came back, undefined while they load. */
  latestCount: number | undefined,
  /** How many Items are sold, undefined while the sold totals load. */
  soldCount: number | undefined,
): boolean | undefined {
  if (latestCount === undefined) return undefined;
  if (latestCount > 0) return false;
  return soldCount === undefined ? undefined : soldCount === 0;
}
