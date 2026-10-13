import {
  DRAWER_LIST,
  heldAtStart,
  PEACE_DOLLARS,
  PEACE_SERIES,
} from "@/components/cabinet/model";
import { CoinFace } from "@/components/coin-face";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";

const peace = DRAWER_LIST.find((drawer) => drawer.key === "peace")!;
const held = heldAtStart(peace);
/** The scarcest of the missing dates, marked as wanted in the example. */
const wanted = new Set(["1921", "1928", "1934-S", "1927-D"]);

/**
 * The Peace dollar Set, seen from above as the tray in Fig 1's open drawer:
 * a recess per date and mint, a coin in each one held.
 */
export function Sets({ t }: { t: Dictionary["sets"] }) {
  const count = held.filter(Boolean).length;
  const percent = Math.floor((count / peace.size) * 100);
  return (
    <section id="sets" className="velvet sets" aria-labelledby="sets-title">
      <div className="wrap grid-12">
        <div className="sets__text">
          <h2 id="sets-title" className="heading" data-split="lines">
            {t.title}
          </h2>
          <p className="lead muted mt-6" data-reveal>
            {t.text}
          </p>
          <p className="mt-6 text-sm muted" data-reveal>
            {t.note}
          </p>
        </div>
        <figure className="sets__tray" data-reveal>
          <div className="tray">
            <figcaption className="tray__head">
              <span className="tray__title">
                {format(t.tray.title, { series: PEACE_SERIES })}
              </span>
              <span className="label tabular">
                {format(t.tray.count, {
                  held: count,
                  total: peace.size,
                  percent,
                })}
              </span>
            </figcaption>
            <ul className="tray__grid">
              {PEACE_DOLLARS.map((title, index) => {
                const isHeld = held[index];
                const isWanted = !isHeld && wanted.has(title);
                const state = isHeld
                  ? t.tray.held
                  : isWanted
                    ? t.tray.wanted
                    : t.tray.missing;
                return (
                  <li
                    key={title}
                    className="recess"
                    data-held={isHeld ? "" : undefined}
                    aria-label={`${PEACE_SERIES} ${title}: ${state}`}
                  >
                    <span className="recess__hole" aria-hidden="true">
                      {isHeld && (
                        <span className="recess__coin">
                          <CoinFace date={title} />
                        </span>
                      )}
                      {isWanted && <span className="recess__wanted" />}
                    </span>
                    <span className="recess__label" aria-hidden="true">
                      {title}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="tray__legend" aria-hidden="true">
              <span className="tray__key">
                <span
                  className="tray__swatch"
                  style={{
                    background: "linear-gradient(145deg, #f4f4f6, #c9cad4)",
                  }}
                />
                {t.tray.held}
              </span>
              <span className="tray__key">
                <span
                  className="tray__swatch"
                  style={{
                    background: "#11143a",
                    boxShadow: "inset 0 0 0 1px rgb(236 236 244 / 0.25)",
                  }}
                />
                {t.tray.missing}
              </span>
              <span className="tray__key">
                <span
                  className="tray__swatch"
                  style={{ border: "1px dashed rgb(170 177 255 / 0.8)" }}
                />
                {t.tray.wanted}
              </span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
