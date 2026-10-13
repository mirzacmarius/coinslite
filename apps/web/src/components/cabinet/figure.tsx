import "@/components/iso/iso.css";
import "./cabinet.css";
import { CabinetArt } from "./art";
import { PEACE_SERIES } from "./model";
import type { Dictionary } from "@/i18n/dictionary";

/** The coin cabinet on its own, in the page's language. */
export function CabinetFigure({ t }: { t: Dictionary["figure"] }) {
  return (
    <div className="cabinet iso" data-theme="light">
      <CabinetArt
        label={t.label}
        text={{ names: { ...t.names, peace: PEACE_SERIES } }}
        status={t.status}
      />
    </div>
  );
}
