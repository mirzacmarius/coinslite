"use client";

import {
  type CabinetText,
  countHeld,
  DRAWER_LIST,
  FIRST,
  heldAtStart,
  readoutOf,
} from "./model";
import {
  CARD_DROP,
  CARDS_AT_START,
  CARDS_MAX,
  DROP,
  HEIGHT,
  TRAVEL,
  WIDTH,
} from "./view";
import type { Flat } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import {
  type Spring,
  spring,
  useInView,
  useLoop,
  useReadout,
} from "@/components/iso/react/live";
import * as React from "react";

export interface DrawerParts {
  back: React.ReactNode;
  pieces: React.ReactNode[];
  falling: React.ReactNode;
  front: React.ReactNode;
  hitFront: string;
  hitTray: string;
  places: Flat[];
}

interface Props {
  label: string;
  text: CabinetText;
  status: { opened: string; added: string; closed: string };
  defs: React.ReactNode;
  bench: React.ReactNode;
  cabinetBack: React.ReactNode;
  cabinetFront: React.ReactNode;
  cardBox: {
    back: React.ReactNode;
    cards: React.ReactNode[];
    front: React.ReactNode;
  };
  drawers: DrawerParts[];
  /** Screen units per world unit along y (a drawer's travel) and z (a drop). */
  units: { y: Flat; z: Flat };
}

/** A drawer slides on its runners with a little weight, and stops without a bounce. */
const SLIDE = { stiffness: 70, damping: 16.5 };
/** Gravity and the rebound of a piece seating in its place, in units and seconds. */
const GRAVITY = 170;
const REBOUND = 0.22;
const FADE_IN = 0.14;
const HOLD = 0.12;
const LIT_AFTER = 0.45;
const TOUR_FIRST = 2.4;
const TOUR_BACK = 3.6;
const DWELL = 0.09;

type Step =
  | { at: number; open: number | null }
  | { at: number; add: true }
  | { at: number; reset: true };

/** The idle tour: add one piece to each drawer in turn, then close up and start over. */
const TOUR: Step[] = [
  { at: 0, open: FIRST },
  { at: TOUR_FIRST, add: true },
  { at: 4.6, open: 3 },
  { at: 6.2, add: true },
  { at: 7.8, open: 1 },
  { at: 9.3, add: true },
  { at: 10.9, open: 0 },
  { at: 12.4, add: true },
  { at: 14, open: null },
  { at: 15.4, reset: true },
];
const LOOP = 15.6;

interface Fall {
  place: number;
  /** Seconds since the piece appeared. */
  age: number;
  z: number;
  speed: number;
  landed: number | null;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );

const shift = (unit: Flat, by: number) =>
  `translate(${Math.round(unit[0] * by * 100) / 100} ${Math.round(unit[1] * by * 100) / 100})`;

export function CabinetLive({
  label,
  text,
  status,
  defs,
  bench,
  cabinetBack,
  cabinetFront,
  cardBox,
  drawers,
  units,
}: Props) {
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const slides = React.useRef<(SVGGElement | null)[][]>(drawers.map(() => []));
  const hits = React.useRef<(SVGGElement | null)[]>([]);
  const fallers = React.useRef<(SVGGElement | null)[]>([]);
  const piecesRef = React.useRef<(SVGGElement | null)[]>([]);
  const cardsRef = React.useRef<SVGGElement | null>(null);
  const live = React.useRef<HTMLParagraphElement>(null);

  const state = React.useRef({
    open: FIRST as number | null,
    pulls: DRAWER_LIST.map(
      (_, index): Spring => ({ at: index === FIRST ? TRAVEL : 0, rate: 0 }),
    ),
    held: DRAWER_LIST.map(heldAtStart),
    falls: DRAWER_LIST.map((): Fall | null => null),
    cards: CARDS_AT_START,
    /** The card being filed: its place in the box and how far above it is. */
    filing: null as {
      index: number;
      z: number;
      wait: number;
      age: number;
    } | null,
    clock: 0,
    touring: true,
    quietFor: TOUR_BACK,
    /** The pointer or the focus is in the figure: the tour waits. */
    inside: false,
    /** Paused with the figure's own button: the tour waits until played. */
    paused: false,
    hover: null as number | null,
    /** An add asked for before its drawer was out. */
    pending: null as "spoken" | "quiet" | null,
    hoverFor: 0,
    next: 1,
  });

  const [openShown, setOpenShown] = React.useState<number | null>(FIRST);
  /** Bumped when a count changes, so the add button knows a full Set. */
  const [, setCounted] = React.useState(0);

  const announce = React.useCallback((message: string) => {
    if (live.current) live.current.textContent = message;
  }, []);

  const valuesOf = React.useCallback(
    (index: number) => {
      const drawer = DRAWER_LIST[index]!;
      return {
        name: text.names[drawer.key],
        held: countHeld(state.current.held[index]!),
        total: drawer.size,
      };
    },
    [text],
  );

  const openDrawer = React.useCallback(
    (index: number | null, speak: boolean) => {
      const s = state.current;
      if (s.open === index) return;
      s.open = index;
      s.pending = null;
      setOpenShown(index);
      if (!speak) return;
      if (index === null) {
        const total = DRAWER_LIST.reduce((sum, drawer) => sum + drawer.size, 0);
        const held = s.held.reduce((sum, list) => sum + countHeld(list), 0);
        announce(fill(status.closed, { held, total }));
      } else announce(fill(status.opened, valuesOf(index)));
    },
    [announce, status, valuesOf],
  );

  /** Drop the next missing piece into the open drawer, if it is out far enough. */
  const add = React.useCallback(
    (speak: boolean) => {
      const s = state.current;
      const index = s.open;
      if (index === null) return;
      const drawer = DRAWER_LIST[index]!;
      const place = drawer.missing.find((at) => !s.held[index]![at]);
      if (place === undefined) return;
      // Still sliding out, or a piece still falling: add when it's ready.
      if (s.pulls[index]!.at < TRAVEL * 0.92 || s.falls[index]) {
        s.pending = speak ? "spoken" : "quiet";
        return;
      }
      s.pending = null;
      s.falls[index] = { place, age: 0, z: DROP, speed: 0, landed: null };
      s.held[index]![place] = true;
      if (s.cards < CARDS_MAX && !s.filing) {
        s.filing = { index: s.cards, z: CARD_DROP, wait: 0.55, age: 0 };
        s.cards += 1;
      }
      if (speak) announce(fill(status.added, valuesOf(index)));
      setCounted((value) => value + 1);
    },
    [announce, status, valuesOf],
  );

  const reset = React.useCallback(() => {
    const s = state.current;
    s.held = DRAWER_LIST.map(heldAtStart);
    s.falls = DRAWER_LIST.map(() => null);
    s.cards = CARDS_AT_START;
    s.filing = null;
    s.pending = null;
    setCounted((value) => value + 1);
    cardsRef.current
      ?.querySelectorAll<SVGGElement>(":scope > g")
      .forEach((node, at) => {
        if (at < CARDS_AT_START) node.setAttribute("data-held", "");
        else node.removeAttribute("data-held");
        node.firstElementChild?.removeAttribute("transform");
        node.removeAttribute("data-lit");
      });
    DRAWER_LIST.forEach((_, index) => {
      const group = piecesRef.current[index];
      group?.querySelectorAll<SVGGElement>(":scope > g").forEach((node, at) => {
        if (s.held[index]![at]) node.setAttribute("data-held", "");
        else node.removeAttribute("data-held");
      });
    });
  }, []);

  const tick = React.useCallback(
    (dt: number, calm: boolean) => {
      const s = state.current;
      let moving = false;

      if (!calm) {
        if (s.touring) {
          const before = s.clock;
          s.clock += dt;
          for (
            let lap = Math.floor(before / LOOP);
            lap <= Math.floor(s.clock / LOOP);
            lap++
          ) {
            for (const step of TOUR) {
              const when = lap * LOOP + step.at;
              if (when <= before || when > s.clock) continue;
              if ("open" in step) openDrawer(step.open, false);
              else if ("add" in step) add(false);
              else reset();
            }
          }
          moving = true;
        } else if (!s.inside && !s.paused) {
          s.quietFor += dt;
          if (s.quietFor >= TOUR_BACK) {
            s.touring = true;
            s.clock = Math.max(0, s.clock);
          }
          moving = true;
        }
        if (s.hover !== null && s.hover !== s.open) {
          s.hoverFor += dt;
          if (s.hoverFor >= DWELL) openDrawer(s.hover, true);
        }
      }

      s.pulls.forEach((pull, index) => {
        const target = s.open === index ? TRAVEL : 0;
        const settled = spring(
          pull,
          target,
          dt,
          SLIDE.stiffness,
          SLIDE.damping,
          calm,
        );
        if (!settled) moving = true;
        const transform = shift(units.y, pull.at);
        for (const node of slides.current[index] ?? [])
          node?.setAttribute("transform", transform);
        hits.current[index]?.setAttribute("transform", transform);
        hits.current[index]?.toggleAttribute(
          "data-out",
          pull.at > TRAVEL * 0.6,
        );
      });

      s.falls.forEach((fall, index) => {
        const node = fallers.current[index];
        if (!fall || !node) return;
        const place = drawers[index]!.places[fall.place]!;
        if (calm) {
          fall.landed = LIT_AFTER;
          fall.z = 0;
        } else {
          fall.age += dt;
          if (fall.age > HOLD && fall.landed === null) {
            fall.speed -= GRAVITY * dt;
            fall.z += fall.speed * dt;
            if (fall.z <= 0) {
              fall.z = 0;
              if (Math.abs(fall.speed) > 8) fall.speed = -fall.speed * REBOUND;
              else {
                fall.speed = 0;
                fall.landed = 0;
              }
            }
          } else if (fall.landed !== null) fall.landed += dt;
        }
        node.setAttribute("transform", `translate(${place[0]} ${place[1]})`);
        node
          .querySelector("use")
          ?.setAttribute("transform", shift(units.z, fall.z));
        node.style.opacity = calm ? "1" : `${Math.min(1, fall.age / FADE_IN)}`;
        node.toggleAttribute("data-on", true);
        if (fall.landed !== null && fall.landed >= LIT_AFTER) {
          piecesRef.current[index]
            ?.querySelectorAll<SVGGElement>(":scope > g")
            [fall.place]?.setAttribute("data-held", "");
          node.toggleAttribute("data-on", false);
          s.falls[index] = null;
        } else moving = true;
      });

      if (s.pending && s.open !== null) {
        const ready = s.pulls[s.open]!.at >= TRAVEL * 0.92 && !s.falls[s.open];
        if (ready) add(s.pending === "spoken");
        else moving = true;
      }

      const filing = s.filing;
      if (filing) {
        const node =
          cardsRef.current?.querySelectorAll<SVGGElement>(":scope > g")[
            filing.index
          ];
        if (calm) filing.z = 0;
        else if (filing.wait > 0) filing.wait -= dt;
        else {
          filing.age += dt;
          filing.z += (0 - filing.z) * (1 - Math.exp(-dt / 0.16));
          if (filing.z < 0.02) filing.z = 0;
        }
        if (node && (calm || filing.wait <= 0)) {
          node.setAttribute("data-held", "");
          node.toggleAttribute("data-lit", filing.z > 0 || filing.age < 0.35);
          const inner = node.firstElementChild;
          if (filing.z > 0)
            inner?.setAttribute("transform", shift(units.z, filing.z));
          else inner?.removeAttribute("transform");
          node.style.opacity = calm
            ? ""
            : `${Math.min(1, filing.age / FADE_IN)}`;
        }
        if (calm || (filing.z === 0 && filing.age > 0.35)) {
          node?.removeAttribute("data-lit");
          if (node) node.style.opacity = "";
          s.filing = null;
        } else moving = true;
      }

      const opened =
        s.open !== null && s.pulls[s.open]!.at > TRAVEL * 0.6 ? s.open : null;
      say(readoutOf(text, opened, s.held));
      return moving;
    },
    [add, drawers, openDrawer, reset, say, text, units],
  );

  const kick = useLoop(tick, visible);
  React.useEffect(() => {
    if (openShown !== null) kick();
  }, [openShown, kick]);

  const interrupt = React.useCallback(() => {
    const s = state.current;
    s.touring = false;
    s.quietFor = 0;
    kick();
  }, [kick]);

  const drawerAt = (target: EventTarget | null) => {
    const value = (target as Element | null)
      ?.closest?.("[data-drawer]")
      ?.getAttribute("data-drawer");
    return value === null || value === undefined ? null : Number(value);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const s = state.current;
    const index = drawerAt(event.target);
    interrupt();
    if (index !== s.hover) {
      s.hover = index;
      s.hoverFor = 0;
    }
  };

  const onStageLeave = () => {
    state.current.hover = null;
  };

  const enterFigure = () => {
    state.current.inside = true;
    interrupt();
  };
  const leaveFigure = () => {
    const s = state.current;
    s.inside = false;
    s.hover = null;
    s.quietFor = 0;
  };
  const [paused, setPaused] = React.useState(false);
  const togglePause = () => {
    const s = state.current;
    s.paused = !s.paused;
    setPaused(s.paused);
    if (s.paused) s.touring = false;
    else {
      s.touring = true;
      s.inside = false;
    }
    kick();
  };

  const onClick = (event: React.MouseEvent) => {
    const s = state.current;
    const index = drawerAt(event.target);
    interrupt();
    if (index === null) return;
    if (s.open === index) add(true);
    else openDrawer(index, true);
  };

  const initial = DRAWER_LIST.map((_, index) =>
    shift(units.y, index === FIRST ? TRAVEL : 0),
  );

  const shown = openShown === null ? null : DRAWER_LIST[openShown]!;
  return (
    // The tour waits while the pointer or the focus is in the figure.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      ref={anchor}
      className="cab-live"
      onPointerEnter={enterFigure}
      onPointerLeave={leaveFigure}
      onFocus={enterFigure}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) leaveFigure();
      }}
    >
      {/* Pointing at a drawer opens it and tapping it adds a piece: shortcuts
          for the buttons below, which do the same from the keyboard. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: see above */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
      <div
        className="cab-stage"
        onPointerMove={onPointerMove}
        onPointerLeave={onStageLeave}
        onClick={onClick}
      >
        <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
          {defs}
          {bench}
          {cabinetBack}
          {drawers.map((parts, index) => {
            const key = DRAWER_LIST[index]!.key;
            const slide = (slot: number) => (node: SVGGElement | null) => {
              const list = slides.current[index] ?? [];
              list[slot] = node;
              slides.current[index] = list;
            };
            return (
              <g key={key} data-drawer-art={index}>
                <g clipPath={`url(#cab-clip-${index})`}>
                  <g ref={slide(0)} transform={initial[index]}>
                    {parts.back}
                    <g
                      className="cab-pieces"
                      ref={(node) => {
                        piecesRef.current[index] = node;
                      }}
                    >
                      {parts.pieces}
                    </g>
                  </g>
                </g>
                <g ref={slide(1)} transform={initial[index]}>
                  <g
                    className="cab-fall"
                    ref={(node) => {
                      fallers.current[index] = node;
                    }}
                  >
                    {parts.falling}
                  </g>
                </g>
                <g clipPath={`url(#cab-clip-${index})`}>
                  <g ref={slide(2)} transform={initial[index]}>
                    {parts.front}
                  </g>
                </g>
              </g>
            );
          })}
          {cabinetFront}
          <g key="card-box">
            {cardBox.back}
            <g className="cab-cards" ref={cardsRef}>
              {cardBox.cards}
            </g>
            {cardBox.front}
          </g>
          <g key="hits" className="cab-hits">
            {drawers.map((parts, index) => (
              <g
                key={DRAWER_LIST[index]!.key}
                ref={(node) => {
                  hits.current[index] = node;
                }}
                transform={initial[index]}
                data-drawer={index}
                data-out={index === FIRST ? "" : undefined}
              >
                <path d={parts.hitFront} />
                <path className="cab-hit-tray" d={parts.hitTray} />
              </g>
            ))}
          </g>
        </IsoFigure>
      </div>
      <div className="cab-controls">
        <fieldset className="cab-drawers">
          <legend className="sr-only">{text.drawers}</legend>
          {[...DRAWER_LIST.keys()].reverse().map((index) => (
            <button
              key={DRAWER_LIST[index]!.key}
              type="button"
              aria-pressed={openShown === index}
              onClick={() => {
                interrupt();
                openDrawer(openShown === index ? null : index, true);
              }}
            >
              {text.names[DRAWER_LIST[index]!.key]}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className="cab-add"
          disabled={
            shown === null || state.current.held[openShown!]!.every(Boolean)
          }
          onClick={() => {
            interrupt();
            add(true);
          }}
        >
          {text.add[shown?.kind ?? "coin"]}
        </button>
        <button
          type="button"
          className="cab-pause"
          aria-pressed={paused}
          onClick={togglePause}
        >
          {paused ? text.play : text.pause}
        </button>
      </div>
      <p ref={live} className="sr-only" aria-live="polite" />
    </div>
  );
}
