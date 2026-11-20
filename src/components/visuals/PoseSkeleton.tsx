import type { PoseFrame } from "../../types"
import { theme } from "../../styles/theme"

const LINKS: [number, number][] = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
]

// Real camera keypoints the model cannot see arrive as NaN and are left out.
const shown = (point?: [number, number]): point is [number, number] =>
  point !== undefined && !Number.isNaN(point[0])

function Figure({ points, color, hot }: { points: [number, number][]; color: string; hot: boolean }) {
  if (points.length === 0) return null
  const nose = points[0] ?? [0, 0]
  return (
    <g>
      {LINKS.map(([a, b]) => {
        const p = points[a]
        const q = points[b]
        if (!shown(p) || !shown(q)) return null
        return (
          <line
            key={`${a}-${b}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke={hot ? theme.riskHigh : color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      })}
      {shown(nose) ? (
        <circle cx={nose[0]} cy={nose[1]} r={10} fill="none" stroke={hot ? theme.riskHigh : color} strokeWidth={2} />
      ) : null}
      {points.map((point, index) =>
        shown(point) ? <circle key={index} cx={point[0]} cy={point[1]} r={2.5} fill={hot ? theme.riskHigh : color} /> : null,
      )}
    </g>
  )
}

export function PoseSkeleton({ frame, highlight }: { frame: PoseFrame; highlight?: "a" | "b" }) {
  return (
    <svg viewBox="0 0 320 180" className="pose" aria-hidden="true" width="100%" height="100%">
      <Figure points={frame.b} color={theme.poseB} hot={highlight === "b"} />
      <Figure points={frame.a} color={theme.poseA} hot={highlight === "a"} />
    </svg>
  )
}
