import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { freePlan } from "@coinslite/backend/convex/plans/rules";

/** What collectors ask before they start, answered plainly. */
export function Questions({ t }: { t: Dictionary["questions"] }) {
  return (
    <section
      id="questions"
      className="questions"
      aria-labelledby="questions-title"
    >
      <div className="wrap grid-12">
        <h2
          id="questions-title"
          className="heading questions__title"
          data-split="lines"
        >
          {t.title}
        </h2>
        <div className="questions__list" data-reveal>
          {t.items.map((item) => (
            <details key={item.question} className="question">
              <summary>
                {item.question}
                <span className="question__sign" aria-hidden="true" />
              </summary>
              <p>{format(item.answer, { limit: freePlan.itemLimit })}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
