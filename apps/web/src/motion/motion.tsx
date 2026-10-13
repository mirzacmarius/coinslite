"use client";

import { Engine } from "./next";
import { setupMotion } from "./setup";

/** The site's motion: one engine, set up with the site's own moves. */
export function Motion() {
  return <Engine setup={setupMotion} />;
}
