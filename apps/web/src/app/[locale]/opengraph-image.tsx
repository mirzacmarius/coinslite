import { DRAWER_LIST, heldAtStart } from "@/components/cabinet/model";
import { getDictionary } from "@/i18n/dictionary";
import { defaultLocale, isLocale } from "@coinslite/i18n";
import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/** Fixed colours from styles/site.css: CSS variables don't reach the renderer. */
const colours = {
  board: "#f2f2ee",
  paper: "#fafaf8",
  ink: "#151517",
  muted: "#5c5c62",
  velvet: "#1d2250",
  velvetDeep: "#11143a",
  coin: "#e9e9ee",
  brand: "#5e6ad2",
};

/** The Peace dollar tray of Fig 1, as it opens: which recesses hold a coin. */
const held = heldAtStart(DRAWER_LIST.find((drawer) => drawer.key === "peace")!);

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

/**
 * The social preview: the promise on board, beside a tray of the Peace dollar
 * Set on velvet, coins in the recesses held.
 */
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
        background: colours.board,
        color: colours.ink,
      }}
    >
      <div
        style={{
          width: 660,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 56px 64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: colours.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                border: "3px solid #ffffff",
              }}
            />
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>
            CoinsLite
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 84,
              lineHeight: 0.95,
              letterSpacing: -4,
              fontWeight: 600,
            }}
          >
            {t.hero.title}
          </div>
          <div style={{ fontSize: 26, color: colours.muted, lineHeight: 1.3 }}>
            {t.hero.kicker}
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colours.velvet,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 438,
            gap: 18,
            padding: 24,
            background: colours.velvetDeep,
          }}
        >
          {held.map((coin, index) => (
            <div
              // Fixed places in a fixed order.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={index}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                background: "#0b0e2c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {coin ? (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: colours.coin,
                    border: "2px solid #c9cad4",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
