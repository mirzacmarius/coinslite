import { Fragment, type ReactNode } from "react";

/** Fills in a text's {placeholders}: format("{count} Items", { count: 4 }). */
export function format(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Like format, but each placeholder may be an element, such as a link. */
export function fill(text: string, values: Record<string, ReactNode>) {
  return text.split(/(\{\w+\})/g).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return (
      // The parts never move, so their index is a stable key.
      // biome-ignore lint/suspicious/noArrayIndexKey: see above
      <Fragment key={index}>
        {name && name in values ? values[name] : part}
      </Fragment>
    );
  });
}
