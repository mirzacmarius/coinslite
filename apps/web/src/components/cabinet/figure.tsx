import "@/components/iso/iso.css";
import "./cabinet.css";
import { Plate } from "@/components/iso/react/draw";
import { CabinetArt } from "./art";
import {
  DRAWER_LIST,
  FIRST,
  heldAtStart,
  PEACE_SERIES,
  readoutOf,
} from "./model";
import type { Dictionary } from "@/i18n/dictionary";

/** Fig 1: the coin cabinet in its plate, in the page's language. */
export function CabinetFigure({ t }: { t: Dictionary["figure"] }) {
  const text = {
    open: t.open,
    closed: t.closed,
    names: { ...t.names, peace: PEACE_SERIES },
    drawers: t.drawers,
    add: t.add,
    pause: t.pause,
    play: t.play,
  };
  return (
    <div className="plate iso" data-theme="light">
      <Plate
        fig={t.fig}
        title={t.title}
        hint={t.hint}
        readout={readoutOf(text, FIRST, DRAWER_LIST.map(heldAtStart))}
        caption={t.caption}
      >
        <CabinetArt label={t.label} text={text} status={t.status} />
      </Plate>
    </div>
  );
}
