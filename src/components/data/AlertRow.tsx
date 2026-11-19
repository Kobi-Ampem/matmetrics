import type { ReactNode } from "react"
import clsx from "clsx"
import type { Flag } from "../../types"
import { athleteById } from "../../data"
import styles from "./AlertRow.module.css"

export function AlertRow({
  alert,
  variant,
  actions,
  seen,
}: {
  alert: Flag
  variant: "light" | "dark"
  actions?: ReactNode
  seen?: boolean
}) {
  const athlete = athleteById(alert.athleteId)
  const source =
    alert.cameras.length > 0
      ? alert.cameras.map((id) => id.replace("cam", "CAM ")).join(" + ")
      : alert.source === "combined"
        ? "BAND + THERMAL"
        : alert.source === "wristband"
          ? "BAND"
          : alert.source.toUpperCase()
  return (
    <article className={clsx(styles.row, styles[variant], styles[alert.level], seen && styles.seen)}>
      <div className={styles.main}>
        <div className={styles.meta}>
          <span className="num">{alert.clock.slice(0, 5)}</span>
          <span className="num">{source}</span>
          <span className={styles.level}>{alert.level === "positive" ? "Good" : alert.level}</span>
        </div>
        <div className={styles.who}>{athlete?.name ?? alert.athleteId}</div>
        <p>{alert.description}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </article>
  )
}
