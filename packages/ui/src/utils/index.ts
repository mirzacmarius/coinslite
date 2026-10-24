import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

export * from "./use-double-check";

/**
 * Returns a function that calls all of its arguments.
 */
export function callAll<Args extends unknown[]>(
  ...fns: (((...args: Args) => unknown) | undefined)[]
) {
  return (...args: Args) =>
    fns.forEach((fn) => {
      fn?.(...args);
    });
}

/**
 * tailwind-merge, told the theme's own font sizes (tailwind.config.ts):
 * otherwise it takes `text-ui` for a colour, and a later colour such as
 * `text-destructive` drops it.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["ui", "ui-lg"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
