import clsx from "clsx"
import type { Camera } from "../../types"
import { theme } from "../../styles/theme"
import styles from "./MatDiagram.module.css"

export interface MatPair {
  id: string
  x: number
  y: number
  alert?: boolean
}

const POS: Record<Camera["position"], { x: number; y: number }> = {
  N: { x: 100, y: 16 },
  E: { x: 184, y: 100 },
  S: { x: 100, y: 184 },
  W: { x: 16, y: 100 },
}

const LIGHT = { floor: theme.bg, frame: theme.lineStrong, mat: theme.surface, ring: theme.ink, centre: theme.lineStrong, cam: theme.night, label: theme.ink2, pair: theme.accent }
const DARK = { floor: theme.night, frame: theme.nightLine, mat: theme.night2, ring: theme.nightInk2, centre: theme.nightLine, cam: theme.nightInk, label: theme.nightInk2, pair: theme.poseA }

export function MatDiagram({
  cameras,
  pairs = [],
  highlightPairId,
  onHover,
  tone = "light",
}: {
  cameras: Camera[]
  pairs?: MatPair[]
  highlightPairId?: string
  onHover?: (id: string | null) => void
  tone?: "light" | "dark"
}) {
  const c = tone === "dark" ? DARK : LIGHT
  return (
    <svg viewBox="0 0 200 200" className={styles.mat} role="img" aria-label="Mat and cameras">
      <rect x="8" y="8" width="184" height="184" fill={c.floor} stroke={c.frame} />
      <circle cx="100" cy="100" r="62" fill={c.mat} stroke={c.ring} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="8" fill="none" stroke={c.centre} />
      {pairs.map((pair) => {
        const hot = pair.alert || pair.id === highlightPairId
        return (
          <circle
            key={pair.id}
            cx={20 + pair.x * 1.6}
            cy={20 + pair.y * 1.6}
            r={hot ? 5 : 3.5}
            fill={hot ? theme.riskHigh : c.pair}
            className={clsx(hot && styles.pulse)}
          />
        )
      })}
      {cameras.map((camera) => {
        const pos = POS[camera.position]
        const warning = camera.status === "warning"
        return (
          <g
            key={camera.id}
            className={onHover ? styles.cam : undefined}
            onMouseEnter={() => onHover?.(camera.id)}
            onMouseLeave={() => onHover?.(null)}
          >
            <rect x={pos.x - 7} y={pos.y - 7} width="14" height="14" rx="2" fill={warning ? theme.riskMed : c.cam} />
            <text x={pos.x} y={pos.y + 18} textAnchor="middle" fontSize="8" fill={c.label} fontFamily={theme.fontData}>
              {camera.position}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
