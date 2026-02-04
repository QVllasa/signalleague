"use client";

import { REVIEW_CATEGORIES } from "@/types";

interface RadarChartProps {
  scores: {
    signalQuality: number;
    riskManagement: number;
    valueForMoney: number;
    communitySupport: number;
    transparency: number;
  };
  size?: number;
}

export function RadarChart({ scores, size = 200 }: RadarChartProps) {
  const categories = Object.entries(REVIEW_CATEGORIES) as [
    keyof typeof REVIEW_CATEGORIES,
    (typeof REVIEW_CATEGORIES)[keyof typeof REVIEW_CATEGORIES],
  ][];

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = 5;

  function polarToCartesian(value: number, index: number) {
    const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
    const r = (value / 5) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = ((i + 1) / levels) * maxR;
    const points = categories
      .map((_, j) => {
        const angle = (Math.PI * 2 * j) / categories.length - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      })
      .join(" ");
    return points;
  });

  // Data points
  const dataPoints = categories
    .map(([key], i) => {
      const val = scores[key as keyof typeof scores] || 0;
      const p = polarToCartesian(val, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Axis lines
  const axes = categories.map((_, i) => {
    const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
    return {
      x2: cx + maxR * Math.cos(angle),
      y2: cy + maxR * Math.sin(angle),
    };
  });

  // Labels
  const labels = categories.map(([key, cat], i) => {
    const angle = (Math.PI * 2 * i) / categories.length - Math.PI / 2;
    const labelR = maxR + 20;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      text: cat.label,
      value: scores[key as keyof typeof scores] || 0,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="mx-auto"
    >
      {/* Grid */}
      {gridRings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
          opacity={0.5}
        />
      ))}

      {/* Axes */}
      {axes.map((axis, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={axis.x2}
          y2={axis.y2}
          stroke="var(--color-border)"
          strokeWidth="1"
          opacity={0.3}
        />
      ))}

      {/* Data area */}
      <polygon
        points={dataPoints}
        fill="color-mix(in srgb, var(--color-primary) 15%, transparent)"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />

      {/* Data dots */}
      {categories.map(([key], i) => {
        const val = scores[key as keyof typeof scores] || 0;
        const p = polarToCartesian(val, i);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--color-primary)"
          />
        );
      })}

      {/* Labels */}
      {labels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[8px] font-mono"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
