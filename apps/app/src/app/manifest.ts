import { brand } from "@/lib/brand";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoinsLite",
    short_name: "CoinsLite",
    description: "Record the coins, banknotes and stamps you own.",
    start_url: "/",
    display: "standalone",
    background_color: brand.lightBackground,
    theme_color: brand.accent,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
