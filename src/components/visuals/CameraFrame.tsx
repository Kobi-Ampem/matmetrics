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
}: {
  camera: Camera
  pose: PoseFrame
  flag?: Flag
  highlight?: "a" | "b"
  size?: "full" | "strip"
  onClick?: () => void
  status?: Camera["status"]
}) {
  const show = status ?? camera.status
  const label = flag ? `RISK · ${riskLabel(flag)}` : ""
  return (
    <button type="button" className={clsx(styles.frame, size === "strip" && styles.strip, flag && styles.flagged)} onClick={onClick}>
      <span className={styles.grid} aria-hidden="true" />
      <span className={styles.top}>
        <span className="num">{camera.label}</span>
        <span className={styles.rec}>REC</span>
      </span>
      <span className={styles.pose}>
        <PoseSkeleton frame={pose} highlight={flag ? highlight ?? "a" : undefined} />
      </span>
      {flag ? <span className={styles.box}>{label}</span> : null}
      {show === "warning" ? <span className={styles.warn}>LENS PARTLY BLOCKED</span> : null}
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
