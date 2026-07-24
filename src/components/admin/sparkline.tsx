import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  className,
  stroke = "currentColor",
  fill = true,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  fill?: boolean;
}) {
  const w = 120;
  const h = 36;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible text-primary", className)}
      aria-hidden
    >
      {fill ? (
        <path d={area} fill={stroke} className="opacity-15" />
      ) : null}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length ? (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="2.5"
          fill={stroke}
        />
      ) : null}
    </svg>
  );
}
