import type { Dictionary } from "@/i18n/dictionary";

/** Where collections live today: the setup, the turn said large, the answer. */
export function Statement({ t }: { t: Dictionary["statement"] }) {
  return (
    <section className="statement-section">
      <div className="wrap grid-12">
        <div className="statement-section__text" data-reveal>
          <p className="lead muted statement-section__lead">{t.lead}</p>
          <p className="statement-section__turn">{t.turn}</p>
          <p className="lead muted statement-section__rest">{t.rest}</p>
        </div>
      </div>
    </section>
  );
}
