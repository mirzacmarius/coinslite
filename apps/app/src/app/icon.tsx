import { ImageResponse } from "next/og";
import { AppIcon } from "./app-icon";

const sizes = [32, 192, 512] as const;

export function generateImageMetadata() {
  return sizes.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id);
  return new ImageResponse(<AppIcon size={size} />, {
    width: size,
    height: size,
  });
}
