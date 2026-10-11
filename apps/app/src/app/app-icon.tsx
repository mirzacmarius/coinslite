import { brand } from "@/lib/brand";

/** The app icon artwork: an indigo square with a white coin ring, drawn for ImageResponse. */
export function AppIcon({ size }: { size: number }) {
  const ring = size * 0.5;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: brand.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: "50%",
          border: `${Math.round(size * 0.06)}px solid ${brand.ring}`,
        }}
      />
    </div>
  );
}
