import { ConvexError } from "convex/values";

/**
 * What an Album may hold. Pure, so the Album form checks the same limits
 * before sending; the backend checks them again on every write.
 */

export const albumErrors = {
  nameRequired: "NAME_REQUIRED",
  tooLong: "TOO_LONG",
  notFound: "ALBUM_NOT_FOUND",
  tooMany: "TOO_MANY_ALBUMS",
} as const;

/** The fixed palette an Album's colour comes from. */
export const albumColours = [
  "grey",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;
export type AlbumColour = (typeof albumColours)[number];

export const albumLimits = {
  name: 80,
  description: 300,
  /** Albums per person: enough for any filing scheme, few enough to list at once. */
  count: 500,
} as const;

export type AlbumInput = {
  name: string;
  description?: string;
  colour: AlbumColour;
};

const fail = (code: string): never => {
  throw new ConvexError(code);
};

/** Checks and tidies an Album's fields: text is trimmed, an empty description is dropped. */
export function checkAlbum({ name, description, colour }: AlbumInput) {
  const trimmedName = name.trim() || fail(albumErrors.nameRequired);
  if (trimmedName.length > albumLimits.name) fail(albumErrors.tooLong);
  const trimmedDescription = description?.trim() || undefined;
  if (
    trimmedDescription !== undefined &&
    trimmedDescription.length > albumLimits.description
  )
    fail(albumErrors.tooLong);
  return {
    name: trimmedName,
    colour,
    ...(trimmedDescription && { description: trimmedDescription }),
  };
}

/** A colour for a new Album: the first one no Album uses yet, else the least used. */
export function nextColour(used: readonly AlbumColour[]): AlbumColour {
  const uses = (colour: AlbumColour) =>
    used.filter((other) => other === colour).length;
  return albumColours.reduce((best, colour) =>
    uses(colour) < uses(best) ? colour : best,
  );
}
