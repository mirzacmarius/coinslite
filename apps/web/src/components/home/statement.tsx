import type { Dictionary } from "@/i18n/dictionary";

/** Where collections live today, said once, large. */
export function Statement({ t }: { t: Dictionary["statement"] }) {
  return (
    <section className="statement-section">
      <div className="wrap grid-12">
        <p className="statement statement-section__text" data-reveal>
          <span className="muted-run">{t.lead}</span>{" "}
          <span className="statement-section__turn">{t.turn}</span>{" "}
          <span className="muted-run">{t.rest}</span>
        </p>
      </div>
    </section>
  );
}
