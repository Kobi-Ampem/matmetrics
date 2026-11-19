import type { ReactNode } from "react"
import clsx from "clsx"
import { Sidebar } from "./Sidebar"
import styles from "./AppShell.module.css"

export function AppShell({ children, theme = "light" }: { children: ReactNode; theme?: "light" | "dark" }) {
  return (
    <div className={clsx(styles.shell, theme === "dark" && styles.dark)}>
      <Sidebar />
      <div className={styles.main}>
        {children}
        <p className={clsx("demo-foot", styles.foot)}>Demo data. Not a medical device.</p>
      </div>
    </div>
  )
}
