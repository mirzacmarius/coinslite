import type { Dictionary } from "@/i18n/dictionary";
import type * as React from "react";

const items = [
  "albums",
  "wantlist",
  "certification",
  "stamps",
  "import",
  "export",
  "charts",
  "sales",
  "languages",
  "phone",
] as const;

/**
 * The rest of the app as a card index: one ruled card per feature, their
 * tabs stepping across as they do in Fig 1's card box.
 */
export function Also({ t }: { t: Dictionary["also"] }) {
  return (
    <section className="also" aria-labelledby="also-title">
      <div className="wrap grid-12">
        <h2 id="also-title" className="heading also__title" data-split="lines">
          {t.title}
        </h2>
        <ul className="also__list" data-reveal>
          {items.map((key, index) => (
            <li
              key={key}
              className="index-card"
              style={{ "--tab": index % 4 } as React.CSSProperties}
            >
              <h3>{t.items[key].title}</h3>
              <p>{t.items[key].text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
