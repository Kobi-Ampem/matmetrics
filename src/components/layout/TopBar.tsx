import type { ReactNode } from "react"
import styles from "./TopBar.module.css"
import clsx from "clsx"

export function TopBar({
  title,
  breadcrumb,
  actions,
  dark,
  center,
}: {
  title: string
  breadcrumb?: ReactNode
  actions?: ReactNode
  dark?: boolean
  center?: ReactNode
}) {
  return (
    <header className={clsx(styles.bar, dark && styles.dark, "no-print")}>
      <div>
        {breadcrumb ? <div className={styles.crumb}>{breadcrumb}</div> : null}
        <h1>{title}</h1>
      </div>
      {center ? <div className={styles.center}>{center}</div> : <div />}
      <div className={styles.actions}>{actions}</div>
    </header>
  )
}
