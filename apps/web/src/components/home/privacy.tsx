import type { Dictionary } from "@/i18n/dictionary";

/** Privacy, said as a poster: one line, three facts under it. */
export function Privacy({ t }: { t: Dictionary["privacy"] }) {
  return (
    <section className="privacy" aria-labelledby="privacy-title">
      <div className="wrap">
        <h2 id="privacy-title" className="privacy__title" data-split="lines">
          {t.title}
        </h2>
        <ul className="privacy__points">
          {t.points.map((point, index) => (
            <li key={point} data-reveal data-delay={index * 0.08}>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
