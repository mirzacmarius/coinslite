import { getDictionary } from "@/i18n/dictionary";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/** Fixed brand colours: CSS variables don't reach the image renderer. */
const colours = {
  accent: "#5e6ad2",
  ring: "#ffffff",
  background: "#fcfcfc",
  text: "#1b1b1f",
  muted: "#63666d",
};

const dictionaryFor = async (params: Promise<{ locale: string }>) => {
  const { locale } = await params;
  return getDictionary(isLocale(locale) ? locale : defaultLocale);
};

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await dictionaryFor(params);
  return [{ id: "card", alt: t.meta.imageAlt, size, contentType: "image/png" }];
}

/** The social preview: the wordmark, the headline and the description, in the page's language. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await dictionaryFor(params);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: colours.background,
        color: colours.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: colours.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              border: `4px solid ${colours.ring}`,
            }}
          />
        </div>
        <div style={{ fontSize: 44, fontWeight: 600 }}>CoinsLite</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 60, lineHeight: 1.1, letterSpacing: -1.5 }}>
          {t.hero.title}
        </div>
        <div style={{ fontSize: 28, color: colours.muted }}>
          {t.hero.eyebrow}
        </div>
      </div>
    </div>,
    size,
  );
}
