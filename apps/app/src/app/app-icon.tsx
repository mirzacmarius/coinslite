/** The app icon artwork: a teal square with a light coin ring, drawn for ImageResponse. */
export function AppIcon({ size }: { size: number }) {
  const ring = size * 0.5;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#0f766e",
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
          border: `${Math.round(size * 0.06)}px solid #ccfbf1`,
        }}
      />
    </div>
  );
}
