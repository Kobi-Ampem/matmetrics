import type { ReactNode } from "react"
import styles from "./Modal.module.css"

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className={styles.layer}>
      <button type="button" className={styles.backdrop} aria-label="Close dialog" onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
