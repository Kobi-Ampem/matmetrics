import type { ReactNode } from "react"
import styles from "./PhoneFrame.module.css"

export function PhoneFrame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className={styles.wrap}>
      {label ? <figcaption className={styles.label}>{label}</figcaption> : null}
      <div className={styles.bezel}>
        <div className={styles.screen}>{children}</div>
      </div>
    </figure>
  )
}
