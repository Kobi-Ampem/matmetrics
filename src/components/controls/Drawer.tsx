import type { ReactNode } from "react"
import { X } from "lucide-react"
import styles from "./Drawer.module.css"

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className={styles.layer}>
      <button type="button" className={styles.backdrop} aria-label="Close panel" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-label={title}>
        <header className={styles.head}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  )
}
