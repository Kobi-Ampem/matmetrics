import type { BodyZone } from "../../types"
import { theme } from "../../styles/theme"
import { ThermalLegend, thermalColor } from "./ThermalLegend"
import styles from "./BodyMap.module.css"

const SHAPES: { zone: BodyZone; front: string; back: string }[] = [
  { zone: "head_neck", front: "M100 18 a18 20 0 1 1 0.1 0 M92 40 h16 v16 h-16 z", back: "M100 18 a18 20 0 1 1 0.1 0 M92 40 h16 v16 h-16 z" },
  { zone: "shoulder_l", front: "M58 62 h28 v22 h-28 z", back: "M58 62 h28 v22 h-28 z" },
  { zone: "shoulder_r", front: "M114 62 h28 v22 h-28 z", back: "M114 62 h28 v22 h-28 z" },
  { zone: "upper_back", front: "M78 66 h44 v28 h-44 z", back: "M74 64 h52 v34 h-52 z" },
  { zone: "lower_back", front: "M80 96 h40 v28 h-40 z", back: "M78 98 h44 v30 h-44 z" },
  { zone: "hip_l", front: "M72 126 h26 v22 h-26 z", back: "M72 128 h26 v20 h-26 z" },
  { zone: "hip_r", front: "M102 126 h26 v22 h-26 z", back: "M102 128 h26 v20 h-26 z" },
  { zone: "knee_l", front: "M74 156 h20 v28 h-20 z", back: "M74 156 h20 v28 h-20 z" },
  { zone: "knee_r", front: "M106 156 h20 v28 h-20 z", back: "M106 156 h20 v28 h-20 z" },
  { zone: "ankle_l", front: "M76 196 h16 v22 h-16 z", back: "M76 196 h16 v22 h-16 z" },
  { zone: "ankle_r", front: "M108 196 h16 v22 h-16 z", back: "M108 196 h16 v22 h-16 z" },
]

export function BodyMap({
  mode,
  zones,
  side,
}: {
  mode: "landing" | "thermal"
  zones: Record<BodyZone, number>
  side: "front" | "back"
}) {
  const max = Math.max(1, ...Object.values(zones))
  return (
    <figure className={styles.wrap}>
      <svg viewBox="0 0 200 240" role="img" aria-label={`${side} body map`}>
        <path d="M100 8 a22 24 0 1 1 0.1 0 M70 58 h60 v80 h-16 l-6 70 h-16 l-6-70 h-16 z M70 150 l-8 70 h18 l6-48 M130 150 l8 70 h-18 l-6-48" fill="none" stroke={theme.lineStrong} />
        {SHAPES.map((shape) => {
          const value = zones[shape.zone] ?? 0
          const fill =
            mode === "thermal"
              ? thermalColor(value)
              : theme.riskHigh
          const opacity = mode === "thermal" ? 0.9 : value <= 0 ? 0.06 : Math.min(0.9, 0.2 + (value / max) * 0.7)
          return <path key={shape.zone} d={side === "front" ? shape.front : shape.back} fill={fill} opacity={opacity} />
        })}
      </svg>
      <figcaption>{side === "front" ? "Front" : "Back"}</figcaption>
      {mode === "thermal" ? <ThermalLegend /> : null}
    </figure>
  )
}
