import type { Dictionary } from "@/i18n/dictionary";

/** The turn's two sentences, each set on a line of its own. */
const sentences = (text: string) => text.split(/(?<=\.)\s+/);

/** Where collections live today: the setup, the turn said large, the answer. */
export function Statement({ t }: { t: Dictionary["statement"] }) {
  return (
    <section className="statement-section">
      <div className="wrap grid-12 statement-section__grid">
        <p className="lead muted statement-section__lead" data-reveal>
          {t.lead}
        </p>
        <p className="statement-section__turn" data-reveal>
          {sentences(t.turn).map((sentence) => (
            <span key={sentence}>{sentence} </span>
          ))}
        </p>
        <p className="lead muted statement-section__rest" data-reveal>
          {t.rest}
        </p>
      </div>
    </section>
  );
}
