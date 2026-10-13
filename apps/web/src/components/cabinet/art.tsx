import {
  BOX_ART,
  CABINET_ART,
  DRAWER_ART,
  EY,
  EZ,
  PIECE_ART,
} from "./geometry";
import { CabinetLive, type DrawerParts } from "./live";
import { type CabinetText, DRAWER_LIST, heldAtStart } from "./model";
import { CARDS_AT_START } from "./view";
import type { Flat } from "@/components/iso/iso-kit";
import { Dots, Line, Solid } from "@/components/iso/react/draw";

/*
 * Fig 1's static drawing, built on the server. Every part is a constant; the
 * live component only places them in painter's order and moves the drawers.
 * The root of every element prop carries a key (references/react.md).
 */

const CABINET_BACK = (
  <g key="cabinet-back">
    <path className="iso-halo" d={CABINET_ART.halo} />
    {CABINET_ART.feet.map((paths, foot) => (
      // Four feet in a fixed order.
      // biome-ignore lint/suspicious/noArrayIndexKey: see above
      <Solid key={foot} paths={paths} tone="mid" />
    ))}
    <Line d={CABINET_ART.footSeams} tone="faint" />
    <Solid
      paths={CABINET_ART.plinth}
      tone="mid"
      inner={<Line d={CABINET_ART.plinthSeam} tone="faint" />}
    />
    <Solid paths={CABINET_ART.body} tone="mid" />
    {CABINET_ART.voids.map((d) => (
      <path key={d} className="cab-void" d={d} />
    ))}
    <Line d={CABINET_ART.panel} tone="lo" />
    <Line d={CABINET_ART.panelInner} tone="faint" />
  </g>
);

const CABINET_FRONT = (
  <g key="cabinet-front">
    <Solid paths={CABINET_ART.cornice} tone="mid" />
    <Solid
      paths={CABINET_ART.top}
      tone="mid"
      inner={<Line d={CABINET_ART.topSeam} tone="faint" />}
    />
    <Line d={CABINET_ART.topGroove} tone="faint" />
    {CABINET_ART.handlePosts.map((paths) => (
      <Solid key={paths.outline} paths={paths} tone="mid" />
    ))}
    <Solid paths={CABINET_ART.handleBar} tone="mid" />
    <Dots points={CABINET_ART.handleScrews} size={0.42} tone="mid" />
  </g>
);

const CARD_BOX = {
  back: (
    <g key="box-back">
      <path className="iso-halo" d={BOX_ART.halo} />
      <Solid paths={BOX_ART.floor} tone="lo" crease="none" />
      <Solid paths={BOX_ART.back} tone="mid" />
      <Solid paths={BOX_ART.left} tone="mid" />
    </g>
  ),
  cards: BOX_ART.cards.map((card, index) => (
    <g
      key={card.card.outline}
      data-held={index < CARDS_AT_START ? "" : undefined}
    >
      <g>
        <Solid paths={card.card} tone="mid" crease="faint" />
        <Line d={card.head} tone="lo" />
        <Line d={card.lines} tone="faint" />
        <Solid paths={card.tab} tone="mid" crease="none" />
      </g>
    </g>
  )),
  front: (
    <g key="box-front">
      <Solid paths={BOX_ART.right} tone="mid" />
      <Solid paths={BOX_ART.front} tone="mid" />
      <Solid paths={BOX_ART.frame} tone="mid" />
      <path className="cab-card" d={BOX_ART.card} />
      <Line d={BOX_ART.card} tone="faint" />
      <Line d={BOX_ART.cardRule} tone="lo" free />
      <Dots points={BOX_ART.rivets} size={0.36} tone="mid" />
      <Solid paths={BOX_ART.knob} tone="mid" />
    </g>
  ),
};

function Coin({ kind, lit }: { kind: "peace" | "euro"; lit?: boolean }) {
  const art = PIECE_ART[kind];
  return (
    <g id={`cab-coin-${kind}${lit ? "-lit" : ""}`}>
      <Solid
        paths={art.body}
        tone="hi"
        lit={lit}
        inner={<Line d={art.milling} tone="faint" />}
      />
      <Line d={art.rim} tone="lo" />
      <Line d={art.inner} tone="faint" />
      <Dots
        points={art.legend}
        size={kind === "euro" ? 0.38 : 0.26}
        tone="lo"
      />
    </g>
  );
}

function Hole({ kind }: { kind: "peace" | "euro" }) {
  const art = PIECE_ART[kind];
  return (
    <g id={`cab-hole-${kind}`}>
      <path className="cab-hole" d={art.hole} />
      <path className="cab-floor" d={art.lens} />
      <Line d={art.floor} tone="faint" />
      <Line d={art.hole} tone="lo" />
    </g>
  );
}

function Note({ lit }: { lit?: boolean }) {
  const art = PIECE_ART.note;
  return (
    <g id={`cab-note${lit ? "-lit" : ""}`}>
      <Solid paths={art.note} tone="hi" lit={lit} crease="none" />
      <Line d={art.border} tone="faint" />
      <Line d={art.watermark} tone="faint" />
      <Line d={art.watermarkInner} tone="lo" />
      <Line d={art.rules} tone="lo" free />
      <Line d={art.serial} tone="faint" free />
    </g>
  );
}

function Stamp({ lit }: { lit?: boolean }) {
  const art = PIECE_ART.stamp;
  return (
    <g id={`cab-stamp${lit ? "-lit" : ""}`}>
      <Solid paths={art.stamp} tone="hi" lit={lit} crease="none" />
      <Dots points={art.perforations} size={0.34} tone="mid" />
      <Line d={art.frame} tone="faint" />
      <Line d={art.vignette} tone="lo" />
      <Line d={art.value} tone="lo" free />
    </g>
  );
}

const DEFS = (
  <defs key="defs">
    <Coin kind="peace" />
    <Coin kind="peace" lit />
    <Coin kind="euro" />
    <Coin kind="euro" lit />
    <Hole kind="peace" />
    <Hole kind="euro" />
    <Note />
    <Note lit />
    <Stamp />
    <Stamp lit />
    <g id="cab-sleeve">
      <Solid paths={PIECE_ART.note.sleeve} tone="lo" crease="none" />
      <Line d={PIECE_ART.note.sleeveLip} tone="faint" />
    </g>
    <clipPath id="cab-tomb-peace">
      <path d={PIECE_ART.peace.clip} />
    </clipPath>
    <clipPath id="cab-tomb-euro">
      <path d={PIECE_ART.euro.clip} />
    </clipPath>
    {DRAWER_ART.map((art, index) => (
      <clipPath key={DRAWER_LIST[index]!.key} id={`cab-clip-${index}`}>
        <path d={art.clip} clipRule="nonzero" />
      </clipPath>
    ))}
  </defs>
);

const translate = ([x, y]: Flat) => `translate(${x} ${y})`;

/** What a place holds, drawn at its spot on the tray. */
function Piece({
  index,
  place,
  at,
}: {
  index: number;
  place: number;
  at: Flat;
}) {
  const drawer = DRAWER_LIST[index]!;
  if (drawer.kind === "coin") {
    return (
      <g transform={translate(at)} data-place={place}>
        <g clipPath={`url(#cab-tomb-${drawer.key})`}>
          <use href={`#cab-coin-${drawer.key}`} />
        </g>
      </g>
    );
  }
  return (
    <use
      href={drawer.kind === "note" ? "#cab-note" : "#cab-stamp"}
      transform={translate(at)}
      data-place={place}
    />
  );
}

function drawerParts(index: number): DrawerParts {
  const art = DRAWER_ART[index]!;
  const drawer = DRAWER_LIST[index]!;
  const key = drawer.key;
  const held = heldAtStart(drawer);
  return {
    back: (
      <g key={`back-${key}`}>
        <Solid paths={art.leftWall} tone="lo" />
        <Solid paths={art.backWall} tone="lo" />
        <Solid paths={art.tray} tone="lo" className="cab-tray" />
        {drawer.kind === "stamp"
          ? PIECE_ART.strips.map((strip) => (
              <g key={strip.lip}>
                <Solid
                  paths={strip.strip}
                  tone="lo"
                  className="cab-strip"
                  crease="none"
                />
                <Line d={strip.lip} tone="faint" />
              </g>
            ))
          : null}
        {art.places.map((at, place) =>
          drawer.kind === "coin" ? (
            <use
              key={`hole-${at.join()}`}
              href={`#cab-hole-${key}`}
              transform={translate(at)}
            />
          ) : drawer.kind === "note" ? (
            <use
              key={`sleeve-${at.join()}`}
              href="#cab-sleeve"
              transform={translate(at)}
            />
          ) : (
            <g key={`spot-${at.join()}`} data-spot={place} />
          ),
        )}
      </g>
    ),
    pieces: art.places.map((at, place) => (
      <g key={`piece-${at.join()}`} data-held={held[place] ? "" : undefined}>
        <Piece index={index} place={place} at={at} />
      </g>
    )),
    falling: (
      <g key={`falling-${key}`} data-falling="">
        <g
          clipPath={
            drawer.kind === "coin" ? `url(#cab-tomb-${key})` : undefined
          }
        >
          <use
            href={
              drawer.kind === "coin"
                ? `#cab-coin-${key}-lit`
                : drawer.kind === "note"
                  ? "#cab-note-lit"
                  : "#cab-stamp-lit"
            }
          />
        </g>
      </g>
    ),
    front: (
      <g key={`front-${key}`}>
        <Solid paths={art.rightWall} tone="mid" />
        <Solid paths={art.panel} tone="mid" />
        <Solid paths={art.frame} tone="mid" />
        <path className="cab-card" d={art.card} />
        <Line d={art.card} tone="faint" />
        <Line d={art.cardRules} tone="lo" free />
        <Dots points={art.rivets} size={0.4} tone="mid" />
        {art.pulls.map((pull) => (
          <g key={pull.bar.outline}>
            <Solid paths={pull.plate} tone="lo" crease="none" />
            <Dots points={pull.screws} size={0.36} tone="mid" />
            {pull.posts.map((post) => (
              <Solid key={post.outline} paths={post} tone="mid" />
            ))}
            <Solid paths={pull.bar} tone="mid" />
          </g>
        ))}
      </g>
    ),
    hitFront: art.hitFront,
    hitTray: art.hitTray,
    places: art.places,
  };
}

const DRAWER_PARTS = DRAWER_LIST.map((_, index) => drawerParts(index));

export function CabinetArt({
  label,
  text,
  status,
}: {
  label: string;
  text: CabinetText;
  /** Announced to assistive tech when the open drawer or a count changes. */
  status: { opened: string; added: string; closed: string };
}) {
  return (
    <CabinetLive
      label={label}
      text={text}
      status={status}
      defs={DEFS}
      cabinetBack={CABINET_BACK}
      cabinetFront={CABINET_FRONT}
      cardBox={CARD_BOX}
      drawers={DRAWER_PARTS}
      units={{ y: EY, z: EZ }}
    />
  );
}
