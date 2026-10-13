import type { Dictionary } from "@/i18n/dictionary";

const facts = ["spot", "currencies", "presets", "scales"] as const;

/** What it's worth: the totals, and four true numbers about how. */
export function Value({ t }: { t: Dictionary["value"] }) {
  return (
    <section className="value" aria-labelledby="value-title">
      <div className="wrap grid-12">
        <div className="value__text">
          <h2 id="value-title" className="heading" data-split="lines">
            {t.title}
          </h2>
          <p className="lead muted mt-6" data-reveal>
            {t.text}
          </p>
        </div>
        <ul className="value__facts">
          {facts.map((key, index) => (
            <li
              key={key}
              className="fact"
              data-reveal
              data-delay={index * 0.06}
            >
              <p className="fact__value">{t.facts[key].value}</p>
              <p className="fact__text">{t.facts[key].text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
