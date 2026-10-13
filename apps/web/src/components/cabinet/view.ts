import {
  type Flat,
  fitProjection,
  iso,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";

/**
 * The world of Fig 1, the coin cabinet: about one unit to 2 mm, x across the
 * cabinet, y from its back to its front (the drawers slide out along +y), z up
 * from the floor it stands on.
 */

export const WIDTH = 560;
export const HEIGHT = 440;
const PAD = 18;
export const AZIMUTH = 55;
export const ELEVATION = 33;

/** The cabinet: plinth on four bun feet, the body, then a top board. */
export const FOOT_H = 4;
export const PLINTH: Plan = { x: -97, y: -57, w: 194, d: 114, r: 1.2 };
export const PLINTH_Z = FOOT_H;
export const PLINTH_H = 8;
export const BODY: Plan = { x: -95, y: -55, w: 190, d: 110, r: 0.6 };
export const BODY_Z = PLINTH_Z + PLINTH_H;
export const FRONT = BODY.y + BODY.d;
export const SIDE = BODY.x + BODY.w;

/** Four drawer slots, bottom to top, between 3-unit rails and 6-unit stiles. */
export const SLOT_H = 15;
export const RAIL = 3;
export const SLOT_X = 89;
export const DRAWERS = 4;
export const slotBottom = (index: number) =>
  BODY_Z + RAIL + index * (SLOT_H + RAIL);
export const slotTop = (index: number) => slotBottom(index) + SLOT_H;
export const BODY_H = RAIL + DRAWERS * (SLOT_H + RAIL);
export const BODY_TOP = BODY_Z + BODY_H;
export const TOP: Plan = { x: -96.8, y: -56.8, w: 193.6, d: 113.6, r: 1.6 };
export const TOP_Z = BODY_TOP + 1.4;
export const TOP_H = 4.6;

/**
 * A drawer, closed, in its own frame: its front panel fills the slot with a
 * 0.5 gap, its box runs 100 back, and it comes out by up to `TRAVEL`.
 */
export const GAP = 0.5;
export const PANEL_D = 3;
export const BOX_BACK = FRONT - 100;
export const WALL = 1.6;
export const FLOOR = 1.2;
export const TRAY = 3.3;
/** How high the box walls stand above the tray. */
export const LIP = 3;
export const TRAVEL = 98;
/** The tray's top, inside a drawer, above the slot's bottom. */
export const TRAY_RISE = GAP + FLOOR + TRAY;
export const trayTop = (index: number) => slotBottom(index) + TRAY_RISE;
export const INSIDE: Plan = {
  x: -SLOT_X + GAP + WALL,
  y: BOX_BACK + WALL,
  w: 2 * (SLOT_X - GAP - WALL),
  d: FRONT - PANEL_D - (BOX_BACK + WALL),
  r: 0,
};

/** Where a coin starts its drop, above its recess. */
export const DROP = 10;

/**
 * The card index on the cabinet's top: a box of record cards standing on
 * edge, one more filed each time a piece goes into a drawer.
 */
export const TOP_SURFACE = TOP_Z + TOP_H;
export const CARD_BOX: Plan = { x: 6, y: -46, w: 78, d: 62, r: 1.2 };
export const BOX_WALL = 1.4;
export const BOX_H = 15;
export const CARD = { x: 10.2, w: 69.6, h: 19.5, d: 0.6 };
export const CARD_FIRST = CARD_BOX.y + BOX_WALL + 3.4;
export const CARD_PITCH = 2.9;
/** Cards in the box at the start, and room for the ones the tour files. */
export const CARDS_AT_START = 11;
export const CARDS_MAX = 16;
/** Where a filed card starts, above its place. */
export const CARD_DROP = 16;

function corners({ x, y, w, d }: Plan, z0: number, z1: number): Point3[] {
  const out: Point3[] = [];
  for (const px of [x, x + w]) {
    for (const py of [y, y + d]) {
      for (const z of [z0, z1]) out.push([px, py, z]);
    }
  }
  return out;
}

export const P = fitProjection(
  [
    // The cabinet from its feet up, then its drawers all the way out.
    ...corners(PLINTH, 0, TOP_Z),
    ...corners(
      { ...PLINTH, y: FRONT, d: TRAVEL },
      slotBottom(0),
      slotTop(DRAWERS - 1),
    ),
    ...corners(TOP, TOP_Z, TOP_Z + TOP_H),
    ...corners(CARD_BOX, TOP_Z + TOP_H, TOP_Z + TOP_H + CARD.h + 4),
  ],
  WIDTH,
  HEIGHT,
  { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3): Flat => iso(point, P);
