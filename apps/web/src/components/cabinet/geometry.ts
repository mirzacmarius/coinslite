import { DRAWER_LIST, type Drawer } from "./model";
import {
  AZIMUTH,
  at,
  BODY,
  BODY_TOP,
  BODY_Z,
  BOX_BACK,
  BOX_H,
  BOX_WALL,
  CARD,
  CARD_BOX,
  CARD_FIRST,
  CARD_PITCH,
  CARDS_MAX,
  DRAWERS,
  ELEVATION,
  FLOOR,
  FOOT_H,
  FRONT,
  GAP,
  INSIDE,
  LIP,
  P,
  PANEL_D,
  PLINTH,
  PLINTH_H,
  PLINTH_Z,
  SIDE,
  SLOT_X,
  slotBottom,
  slotTop,
  TOP,
  TOP_H,
  TOP_SURFACE,
  TOP_Z,
  TRAY,
  trayTop,
  WALL,
} from "./view";
import {
  cameraOf,
  circleRing,
  cylinder,
  extrude,
  type Flat,
  haloOf,
  insetPlan,
  knurl,
  onTop,
  type Plan,
  type Plane,
  type Point3,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
} from "@/components/iso/iso-kit";

const solid = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) =>
  slabOf(plan, z, h, P, steps, bevel);
const cyl = (
  cx: number,
  cy: number,
  r: number,
  z: number,
  h: number,
  steps = 32,
) => cylinder(cx, cy, r, z, h, P, steps);
const join = (paths: string[]) => paths.filter(Boolean).join("");
const RADIANS = Math.PI / 180;
const { k: K, sinE: SIN_E, cosE: COS_E } = cameraOf(P);
const round = (value: number) => Math.round(value * 10) / 10;

/** A rectangle on the plane y = const (the cabinet's front, a drawer's front). */
const rectY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf(
    [at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])],
    true,
  );

/** A rounded rectangle on the plane x = const (the cabinet's side). */
function roundRectX(
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  r: number,
) {
  const points: Flat[] = [];
  const corner = (cy: number, cz: number, from: number) => {
    for (let step = 0; step <= 6; step++) {
      const angle = (from + (90 * step) / 6) * RADIANS;
      points.push(at([x, cy + r * Math.cos(angle), cz + r * Math.sin(angle)]));
    }
  };
  corner(y1 - r, z0 + r, -90);
  corner(y1 - r, z1 - r, 0);
  corner(y0 + r, z1 - r, 90);
  corner(y0 + r, z0 + r, 180);
  return pathOf(points, true);
}

/* ---------------------------------------------------------------- cabinet */

const BUN_FEET: Plane[] = [
  [PLINTH.x + 9, PLINTH.y + 9],
  [PLINTH.x + PLINTH.w - 9, PLINTH.y + 9],
  [PLINTH.x + 9, PLINTH.y + PLINTH.d - 9],
  [PLINTH.x + PLINTH.w - 9, PLINTH.y + PLINTH.d - 9],
];
const BODY_SHAPE = solid(BODY, BODY_Z, BODY_TOP - BODY_Z, 2);
const PANEL = {
  y0: BODY.y + 9,
  y1: FRONT - 9,
  z0: BODY_Z + 7,
  z1: BODY_TOP - 22,
};
const HANDLE_Z = BODY_TOP - 11;

export const CABINET_ART = {
  halo: haloOf(insetPlan(PLINTH, -3), 0, 1, P),
  feet: BUN_FEET.map(([x, y]) => cyl(x, y, 4.6, 0, FOOT_H, 28)),
  footSeams: join(BUN_FEET.map(([x, y]) => sideArc(x, y, 4.6, 1.8, P, 16))),
  plinth: solid(PLINTH, PLINTH_Z, PLINTH_H, 3, 0.8),
  plinthSeam: sideSeam(PLINTH, PLINTH_Z + 3, P, 3),
  body: BODY_SHAPE,
  /** The dark inside of each slot, seen when its drawer is out. */
  voids: Array.from({ length: DRAWERS }, (_, index) =>
    rectY(FRONT, -SLOT_X, SLOT_X, slotBottom(index), slotTop(index)),
  ),
  /** A raised panel on the side, in two outlines. */
  panel: roundRectX(SIDE, PANEL.y0, PANEL.y1, PANEL.z0, PANEL.z1, 2.4),
  panelInner: roundRectX(
    SIDE,
    PANEL.y0 + 2.6,
    PANEL.y1 - 2.6,
    PANEL.z0 + 2.6,
    PANEL.z1 - 2.6,
    1.2,
  ),
  /** A carrying handle on the side: two posts and a bar. */
  handlePosts: [-13, 13].map((y) =>
    solid(
      { x: SIDE, y: y - 1.2, w: 3.2, d: 2.4, r: 0.6 },
      HANDLE_Z - 1.2,
      2.4,
      2,
    ),
  ),
  handleBar: solid(
    { x: SIDE + 3.2, y: -15, w: 1.8, d: 30, r: 0.9 },
    HANDLE_Z - 1.1,
    2.2,
    3,
  ),
  handleScrews: [-13, 13].flatMap((y) => [
    at([SIDE, y, HANDLE_Z + 2.6]),
    at([SIDE, y, HANDLE_Z - 2.6]),
  ]),
  cornice: solid(insetPlan(BODY, -0.9), BODY_TOP - 0.6, 2, 2, 0.4),
  top: solid(TOP, TOP_Z, TOP_H, 3, 1.2),
  topSeam: sideSeam(TOP, TOP_Z + 1.8, P, 3),
  topGroove: planOutline(insetPlan(TOP, 7), TOP_Z + TOP_H, P, 3),
};

/* ---------------------------------------------------------------- drawers */

/**
 * Where a drawer may show itself: outside the cabinet's silhouette, or on the
 * front below its own slot's top and left of the right stile. Everything else
 * the body, the drawers above and the right stile cover. Built for a clip
 * path with clip-rule evenodd: a big frame, the silhouette, then that part of
 * the front.
 */
function clipOf(index: number) {
  const area = (points: Flat[]) =>
    points.reduce((sum, [ax, ay], at) => {
      const [bx, by] = points[(at + 1) % points.length]!;
      return sum + ax * by - bx * ay;
    }, 0);
  /** Wound one way (`turn` 1) or the other, so nonzero can add and subtract. */
  const wound = (points: Flat[], turn: 1 | -1) =>
    pathOf(
      Math.sign(area(points)) === turn ? points : [...points].reverse(),
      true,
    );
  const hull = (points: Flat[]) => {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: Flat, a: Flat, b: Flat) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const chain = (list: Flat[]) => {
      const out: Flat[] = [];
      for (const point of list) {
        while (
          out.length >= 2 &&
          cross(out[out.length - 2]!, out[out.length - 1]!, point) <= 0
        )
          out.pop();
        out.push(point);
      }
      return out.slice(0, -1);
    };
    return [...chain(sorted), ...chain([...sorted].reverse())];
  };
  const body: Flat[] = [];
  for (const x of [BODY.x, BODY.x + BODY.w]) {
    for (const y of [BODY.y, FRONT]) {
      for (const z of [BODY_Z, BODY_TOP]) body.push(at([x, y, z]));
    }
  }
  // The front below the slot's top reaches well past the body to the left
  // and below, so no sliver opens where its edges meet the silhouette's.
  const front: Flat[] = [
    at([BODY.x - 60, FRONT, BODY_Z - 60]),
    at([SLOT_X, FRONT, BODY_Z - 60]),
    at([SLOT_X, FRONT, slotTop(index)]),
    at([BODY.x - 60, FRONT, slotTop(index)]),
  ];
  const frame: Flat[] = [
    [-200, -200],
    [800, -200],
    [800, 700],
    [-200, 700],
  ];
  return wound(frame, 1) + wound(hull(body), -1) + wound(front, 1);
}

interface Layout {
  /** Local x and y of each place, in Catalog order (back row first). */
  places: Plane[];
}

/** A grid of places, back row first, centred on the usable tray. */
function grid(
  columns: number,
  rows: number,
  pitchX: number,
  pitchY: number,
  middle: number,
): Layout {
  const places: Plane[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      places.push([
        (column - (columns - 1) / 2) * pitchX,
        middle + (row - (rows - 1) / 2) * pitchY,
      ]);
    }
  }
  return { places };
}

/** The tray's usable depth: clear of the back wall and of the front panel's shadow. */
const USABLE_MIDDLE = (INSIDE.y + (FRONT - PANEL_D - 4.1)) / 2;

interface CoinSpec {
  coin: number;
  recess: number;
  thickness: number;
  depth: number;
  /** A bimetallic 2 euro: its inner ring and the 12 stars of the outer one. */
  euro: boolean;
}

const COINS: Record<"peace" | "euro", CoinSpec> = {
  peace: { coin: 9.5, recess: 10.8, thickness: 2.4, depth: 2.8, euro: false },
  euro: { coin: 6.4, recess: 7.6, thickness: 2.2, depth: 2.4, euro: true },
};

const LAYOUTS: Record<Drawer["key"], Layout> = {
  peace: grid(6, 4, 27.5, 22.4, USABLE_MIDDLE),
  euro: grid(9, 5, 18.6, 16.4, USABLE_MIDDLE),
  notes: grid(2, 2, 84, 48, USABLE_MIDDLE),
  stamps: grid(6, 3, 26, 26, USABLE_MIDDLE),
};

/** One screen vector per world unit along x, y and z. */
const ORIGIN = at([0, 0, 0]);
const unitOf = (point: Point3): Flat => {
  const [x, y] = at(point);
  return [x - ORIGIN[0], y - ORIGIN[1]];
};
const EX = unitOf([1, 0, 0]);
/** Screen units per world unit along y (a drawer's travel) and z (a drop). */
export const EY = unitOf([0, 1, 0]);
export const EZ = unitOf([0, 0, 1]);

/** The screen offset of a world offset, for `translate()`. */
export const offsetOf = ([x, y, z]: Point3): Flat => [
  round(EX[0] * x + EY[0] * y + EZ[0] * z),
  round(EX[1] * x + EY[1] * y + EZ[1] * z),
];

/**
 * A coin and its recess, drawn at the world origin's place on the tray (the
 * projection is affine, so every recess is this drawing moved). The clip is
 * the recess rim plus everything above its middle: the part of a coin sunk
 * below the tray shows only inside the rim.
 */
function coinArt(spec: CoinSpec, tray: number) {
  const bottom = tray - spec.depth;
  const top = bottom + spec.thickness;
  const [cx, cy] = at([0, 0, tray]);
  const a = spec.recess * K;
  const b = spec.recess * K * SIN_E;
  const drop = spec.depth * K * COS_E;
  const half = Math.asin(Math.min(1, drop / (2 * b)));
  const floorLeft: Flat = [cx - a * Math.cos(half), cy + drop / 2];
  const floorRight: Flat = [cx + a * Math.cos(half), cy + drop / 2];
  const ellipse = (rx: number, ry: number, x: number, y: number) =>
    `M${round(x - rx)} ${round(y)}A${round(rx)} ${round(ry)} 0 1 0 ${round(x + rx)} ${round(y)}A${round(rx)} ${round(ry)} 0 1 0 ${round(x - rx)} ${round(y)}Z`;
  const legend = circleRing(
    0,
    0,
    spec.coin - (spec.euro ? 1.5 : 2),
    spec.euro ? 12 : 40,
  ).map(([x, y]) => at([x, y, top]));
  const floorArc = `M${round(floorLeft[0])} ${round(floorLeft[1])}A${round(a)} ${round(b)} 0 0 1 ${round(floorRight[0])} ${round(floorRight[1])}`;
  return {
    hole: ellipse(a, b, cx, cy),
    floor: floorArc,
    /** The floor you see past the rim: under the floor's far arc, inside the rim. */
    lens: `${floorArc}A${round(a)} ${round(b)} 0 0 1 ${round(floorLeft[0])} ${round(floorLeft[1])}Z`,
    clip: `M${round(cx - a)} ${round(cy)}V${round(cy - 60)}H${round(cx + a)}V${round(cy)}A${round(a)} ${round(b)} 0 0 1 ${round(cx - a)} ${round(cy)}Z`,
    body: cyl(0, 0, spec.coin, bottom, spec.thickness, 48),
    milling: knurl(
      0,
      0,
      spec.coin,
      bottom + 0.25,
      top - 0.25,
      spec.euro ? 56 : 80,
      P,
      0.25,
    ),
    rim: ring(0, 0, spec.coin - 0.9, top, P, 48),
    inner: spec.euro
      ? ring(0, 0, spec.coin * 0.66, top, P, 40)
      : ring(0, 0, spec.coin * 0.42, top, P, 36),
    legend,
  };
}

/** A banknote in its sleeve, drawn at the origin's place on the tray. */
function noteArt(tray: number) {
  const sleeve: Plan = { x: -39, y: -21, w: 78, d: 42, r: 0.8 };
  const note: Plan = { x: -36, y: -18, w: 72, d: 36, r: 0.4 };
  const noteTop = tray + 0.9;
  return {
    sleeve: solid(sleeve, tray, 0.5, 2),
    sleeveLip: onTop(
      [
        [sleeve.x, sleeve.y + 7],
        [sleeve.x + sleeve.w, sleeve.y + 7],
      ],
      tray + 0.5,
      P,
    ),
    note: solid(note, tray + 0.5, 0.4, 2),
    border: planOutline(insetPlan(note, 2.6), noteTop, P, 2),
    watermark: onTop(
      circleRing(note.x + note.w - 15, 0, 7.5, 36),
      noteTop,
      P,
      true,
    ),
    watermarkInner: onTop(
      circleRing(note.x + note.w - 15, 0, 5, 30),
      noteTop,
      P,
      true,
    ),
    rules: join([
      onTop(
        [
          [note.x + 7, -9],
          [note.x + 34, -9],
        ],
        noteTop,
        P,
      ),
      onTop(
        [
          [note.x + 7, -5.6],
          [note.x + 26, -5.6],
        ],
        noteTop,
        P,
      ),
      onTop(
        [
          [note.x + 7, 9.4],
          [note.x + 20, 9.4],
        ],
        noteTop,
        P,
      ),
    ]),
    serial: onTop(
      [
        [note.x + 30, 11.6],
        [note.x + 46, 11.6],
      ],
      noteTop,
      P,
    ),
  };
}

/** A stamp on its stock strip, drawn at the origin's place. */
function stampArt(tray: number) {
  const stamp: Plan = { x: -7.5, y: -9, w: 15, d: 18, r: 0 };
  const top = tray + 1;
  const perforations: Flat[] = [];
  const step = 1.5;
  for (let x = stamp.x + 0.75; x < stamp.x + stamp.w; x += step) {
    perforations.push(at([x, stamp.y, top]), at([x, stamp.y + stamp.d, top]));
  }
  for (let y = stamp.y + 0.75; y < stamp.y + stamp.d; y += step) {
    perforations.push(at([stamp.x, y, top]), at([stamp.x + stamp.w, y, top]));
  }
  return {
    stamp: solid(stamp, tray + 0.7, 0.3, 1),
    frame: planOutline(insetPlan(stamp, 1.8), top, P, 1),
    vignette: onTop(circleRing(0, -1.2, 3.6, 28), top, P, true),
    value: onTop(
      [
        [stamp.x + 3, 5.6],
        [stamp.x + 8, 5.6],
      ],
      top,
      P,
    ),
    perforations,
  };
}

/** One drawer's static parts, closed, in painter's order groups. */
function drawerArt(index: number, drawer: Drawer) {
  const bottom = slotBottom(index) + GAP;
  const top = slotTop(index) - GAP;
  const middle = (slotBottom(index) + slotTop(index)) / 2;
  const tray = trayTop(index);
  const wallTop = tray + LIP;
  const length = FRONT - PANEL_D - BOX_BACK;
  const left = -SLOT_X + GAP;
  const right = SLOT_X - GAP;
  const panelFront = FRONT;
  const pulls = [-58, 58].map((cx) => ({
    plate: solid(
      { x: cx - 11, y: panelFront, w: 22, d: 0.5, r: 0.8 },
      middle - 2.3,
      4.6,
      2,
    ),
    posts: [cx - 8, cx + 8].map((px) =>
      solid(
        { x: px - 1.2, y: panelFront + 0.5, w: 2.4, d: 2.8, r: 0.6 },
        middle - 1.1,
        2.2,
        2,
      ),
    ),
    bar: solid(
      { x: cx - 9.6, y: panelFront + 3.3, w: 19.2, d: 1.8, r: 0.9 },
      middle - 1,
      2,
      3,
    ),
    screws: [cx - 10, cx + 10].map((px) => at([px, panelFront + 0.5, middle])),
  }));
  const layout = LAYOUTS[drawer.key];
  return {
    clip: clipOf(index),
    leftWall: solid(
      { x: left, y: BOX_BACK, w: WALL, d: length, r: 0 },
      bottom,
      wallTop - bottom,
      1,
    ),
    backWall: solid(
      { x: left, y: BOX_BACK, w: right - left, d: WALL, r: 0 },
      bottom,
      wallTop - bottom,
      1,
    ),
    tray: extrude(
      [
        [INSIDE.x, INSIDE.y],
        [INSIDE.x + INSIDE.w, INSIDE.y],
        [INSIDE.x + INSIDE.w, INSIDE.y + INSIDE.d],
        [INSIDE.x, INSIDE.y + INSIDE.d],
      ],
      bottom + FLOOR,
      TRAY,
      P,
    ),
    rightWall: solid(
      { x: right - WALL, y: BOX_BACK, w: WALL, d: length, r: 0 },
      bottom,
      wallTop - bottom,
      1,
    ),
    panel: solid(
      { x: left, y: FRONT - PANEL_D, w: right - left, d: PANEL_D, r: 0.3 },
      bottom,
      top - bottom,
      2,
      0.5,
    ),
    frame: solid(
      { x: -17, y: panelFront, w: 34, d: 0.7, r: 0.3 },
      middle - 4.2,
      8.4,
      2,
      0.3,
    ),
    card: rectY(panelFront + 0.7, -15, 15, middle - 2.7, middle + 2.7),
    cardRules: join([
      pathOf([
        at([-12, panelFront + 0.7, middle + 0.9]),
        at([8, panelFront + 0.7, middle + 0.9]),
      ]),
      pathOf([
        at([-12, panelFront + 0.7, middle - 1.1]),
        at([1, panelFront + 0.7, middle - 1.1]),
      ]),
    ]),
    rivets: [-16.1, 16.1].map((x) => at([x, panelFront + 0.7, middle])),
    pulls,
    /** The drawer's outline from above and in front, for pointer hits. */
    hitFront: rectY(panelFront, left, right, bottom, top),
    hitTray: pathOf(
      [
        at([left, BOX_BACK, wallTop]),
        at([right, BOX_BACK, wallTop]),
        at([right, FRONT, wallTop]),
        at([right, FRONT, bottom]),
        at([left, FRONT, bottom]),
        at([left, FRONT, wallTop]),
      ],
      true,
    ),
    places: layout.places.map(([x, y]) => offsetOf([x, y, 0])),
  };
}

export const DRAWER_ART = DRAWER_LIST.map((drawer, index) =>
  drawerArt(index, drawer),
);

/** Pieces drawn once per kind of tray and placed with `translate()`. */
export const PIECE_ART = {
  peace: coinArt(COINS.peace, trayTop(2)),
  euro: coinArt(COINS.euro, trayTop(3)),
  note: noteArt(trayTop(1)),
  stamp: stampArt(trayTop(0)),
  /** The stock strips of the stamp drawer, across its tray. */
  strips: [0, 1, 2].map((row) => {
    const y = LAYOUTS.stamps.places[row * 6]![1];
    return {
      strip: solid(
        { x: INSIDE.x + 4, y: y - 10, w: INSIDE.w - 8, d: 20, r: 0 },
        trayTop(0),
        0.7,
        1,
      ),
      lip: onTop(
        [
          [INSIDE.x + 4, y + 2],
          [INSIDE.x + INSIDE.w - 4, y + 2],
        ],
        trayTop(0) + 0.7,
        P,
      ),
    };
  }),
};

/* -------------------------------------------------------------- card box */

const BOX = CARD_BOX;
const BOX_TOP = TOP_SURFACE + BOX_H;
const BOX_FRONT = BOX.y + BOX.d;
const CARD_Z = TOP_SURFACE + 1;
const TABS = [3, 19, 35, 51];

function cardArt(index: number) {
  const y = CARD_FIRST + index * CARD_PITCH;
  const guide = index === 0;
  const height = CARD.h + (guide ? 2.4 : 0);
  const top = CARD_Z + height;
  const face = y + CARD.d;
  const tabX = guide ? 6 : TABS[index % TABS.length]!;
  const tabW = guide ? 24 : 14;
  const lines = [4, 6.8, 9.6, 12.4, 15.2].map((below) =>
    pathOf([
      at([CARD.x, face, top - below]),
      at([CARD.x + CARD.w, face, top - below]),
    ]),
  );
  return {
    card: solid(
      { x: CARD.x, y, w: CARD.w, d: CARD.d, r: 0 },
      CARD_Z,
      height,
      1,
    ),
    tab: solid({ x: CARD.x + tabX, y, w: tabW, d: CARD.d, r: 0 }, top, 2.6, 1),
    head: lines[0]!,
    lines: join(lines.slice(1)),
  };
}

export const BOX_ART = {
  halo: haloOf(insetPlan(BOX, 1), TOP_SURFACE, 1, P),
  floor: solid(insetPlan(BOX, BOX_WALL), TOP_SURFACE, 1, 1),
  back: solid(
    { x: BOX.x, y: BOX.y, w: BOX.w, d: BOX_WALL, r: 0 },
    TOP_SURFACE,
    BOX_H,
    1,
    0.3,
  ),
  left: solid(
    { x: BOX.x, y: BOX.y, w: BOX_WALL, d: BOX.d, r: 0 },
    TOP_SURFACE,
    BOX_H,
    1,
    0.3,
  ),
  right: solid(
    { x: BOX.x + BOX.w - BOX_WALL, y: BOX.y, w: BOX_WALL, d: BOX.d, r: 0 },
    TOP_SURFACE,
    BOX_H,
    1,
    0.3,
  ),
  front: solid(
    { x: BOX.x, y: BOX_FRONT - BOX_WALL, w: BOX.w, d: BOX_WALL, r: 0.4 },
    TOP_SURFACE,
    BOX_H,
    2,
    0.4,
  ),
  frame: solid(
    { x: BOX.x + BOX.w / 2 - 13, y: BOX_FRONT, w: 26, d: 0.6, r: 0.3 },
    BOX_TOP - 7.6,
    6,
    2,
    0.3,
  ),
  card: rectY(
    BOX_FRONT + 0.6,
    BOX.x + BOX.w / 2 - 11.2,
    BOX.x + BOX.w / 2 + 11.2,
    BOX_TOP - 6.2,
    BOX_TOP - 3,
  ),
  cardRule: pathOf([
    at([BOX.x + BOX.w / 2 - 8.6, BOX_FRONT + 0.6, BOX_TOP - 4.6]),
    at([BOX.x + BOX.w / 2 + 3, BOX_FRONT + 0.6, BOX_TOP - 4.6]),
  ]),
  rivets: [-12.3, 12.3].map((dx) =>
    at([BOX.x + BOX.w / 2 + dx, BOX_FRONT + 0.6, BOX_TOP - 4.6]),
  ),
  /** The rod that locks the cards in, ending in a knob on the front. */
  knob: solid(
    { x: BOX.x + BOX.w / 2 - 2, y: BOX_FRONT, w: 4, d: 2.6, r: 1.2 },
    TOP_SURFACE + 3,
    3.4,
    3,
    0.3,
  ),
  cards: Array.from({ length: CARDS_MAX }, (_, index) => cardArt(index)),
};

/** A drawer pulled out by `distance` along y, as a translate. */
export const slideOf = (distance: number) => {
  const [x, y] = offsetOf([0, distance, 0]);
  return `translate(${x} ${y})`;
};

export const CAMERA = { azimuth: AZIMUTH, elevation: ELEVATION };
