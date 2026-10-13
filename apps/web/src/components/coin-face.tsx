import { useId } from "react";

const BEADS = Array.from({ length: 64 }, (_, at) => {
  const angle = (at / 64) * Math.PI * 2;
  return [
    Math.round((50 + Math.cos(angle) * 44.5) * 100) / 100,
    Math.round((50 + Math.sin(angle) * 44.5) * 100) / 100,
  ] as const;
});

/**
 * A silver dollar, drawn: beaded rim, legends arched round the field, and on
 * the obverse the date and its mint mark. Decorative: what it shows is also
 * said in text beside it.
 */
export function CoinFace({
  date,
  side = "obverse",
  className,
}: {
  /** As the Catalog writes it: "1922" or "1922-D". */
  date: string;
  side?: "obverse" | "reverse";
  className?: string;
}) {
  // An id that is safe inside url(#…).
  const id = `coin${useId().replace(/[^\w-]/g, "")}`;
  const [year, mint] = date.split("-");
  const reverse = side === "reverse";
  return (
    <svg
      viewBox="0 0 100 100"
      className={className ? `coin-face ${className}` : "coin-face"}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-metal`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fdfdfe" />
          <stop offset="0.55" stopColor="#e4e5ea" />
          <stop offset="1" stopColor="#b9bbc8" />
        </radialGradient>
        <path id={`${id}-top`} d="M18 52 A32 32 0 0 1 82 52" />
        <path id={`${id}-bottom`} d="M22 60 A29 29 0 0 0 78 60" />
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id}-metal)`} />
      <circle
        cx="50"
        cy="50"
        r="48.6"
        fill="none"
        stroke="#7c7e90"
        strokeWidth="0.8"
      />
      <g fill="#9597a8">
        {BEADS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" />
        ))}
      </g>
      <circle
        cx="50"
        cy="50"
        r="40.5"
        fill="none"
        stroke="#151517"
        strokeOpacity="0.14"
        strokeWidth="0.7"
      />
      <text className={reverse ? "coin-face__motto" : "coin-face__legend"}>
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {reverse ? "UNITED STATES OF AMERICA" : "LIBERTY"}
        </textPath>
      </text>
      <text className="coin-face__motto">
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {reverse ? "ONE DOLLAR" : "IN GOD WE TRVST"}
        </textPath>
      </text>
      {reverse ? (
        <text x="50" y="54" className="coin-face__mint">
          E PLURIBUS UNUM
        </text>
      ) : (
        <>
          <text x="50" y={mint ? "54" : "57"} className="coin-face__date">
            {year}
          </text>
          {mint && (
            <text x="50" y="66" className="coin-face__mint">
              {mint}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
