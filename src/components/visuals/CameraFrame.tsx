import type { ReactNode } from "react"
import clsx from "clsx"
import type { Camera, Flag, PoseFrame } from "../../types"
import { PoseSkeleton } from "./PoseSkeleton"
import styles from "./CameraFrame.module.css"

export function CameraFrame({
  camera,
  pose,
  flag,
  highlight,
  size = "full",
  onClick,
  status,
  media,
  notice,
  box,
}: {
  camera: Camera
  pose: PoseFrame
  flag?: Flag
  highlight?: "a" | "b"
  size?: "full" | "strip"
  onClick?: () => void
  status?: Camera["status"]
  // Real camera mode: the phone's picture behind the skeleton, a line of text when there is
  // no signal, and the flag box drawn around the flagged person (percent of the frame).
  media?: ReactNode
  notice?: string
  box?: { left: number; top: number; width: number; height: number }
}) {
  const show = status ?? camera.status
  const label = flag ? `RISK · ${riskLabel(flag)}` : ""
  return (
    <button
      type="button"
      className={clsx(styles.frame, size === "strip" && styles.strip, flag && styles.flagged, media !== undefined && styles.real)}
      onClick={onClick}
    >
      {media ? <span className={styles.media}>{media}</span> : null}
      <span className={styles.grid} aria-hidden="true" />
      <span className={styles.top}>
        <span className="num">{camera.label}</span>
        <span className={styles.rec}>REC</span>
      </span>
      <span className={styles.pose}>
        <PoseSkeleton frame={pose} highlight={flag ? highlight ?? "a" : undefined} />
      </span>
      {flag ? (
        <span
          className={styles.box}
          style={box ? { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` } : undefined}
        >
          {label}
        </span>
      ) : null}
      {show === "warning" ? <span className={styles.warn}>LENS PARTLY BLOCKED</span> : null}
      {notice ? <span className={styles.notice}>{notice}</span> : null}
    </button>
  )
}

function riskLabel(flag: Flag): string {
  if (flag.kind === "neck_landing") return "NECK LANDING"
  if (flag.kind === "shoulder_landing") return "SHOULDER"
  if (flag.kind === "knee_twist") return "KNEE"
  if (flag.kind === "mat_edge") return "MAT EDGE"
  if (flag.kind === "hips_high_shot") return "HIPS HIGH"
  return flag.kind.replaceAll("_", " ").toUpperCase()
}
