import clsx from "clsx"
import styles from "./LoadBar.module.css"

export function LoadBar({ value, warnBelow, warnAbove = 85 }: { value: number; warnBelow?: number; warnAbove?: number }) {
  const width = Math.max(0, Math.min(100, value))
  const hot = warnBelow != null ? value < warnBelow : value > warnAbove
  return (
    <span className={styles.wrap}>
      <span className={styles.track} aria-hidden="true">
        <span className={clsx(styles.fill, hot && styles.hot)} style={{ width: `${width}%` }} />
      </span>
      <span className={clsx("num", styles.value)}>{Math.round(value)}</span>
    </span>
  )
}
