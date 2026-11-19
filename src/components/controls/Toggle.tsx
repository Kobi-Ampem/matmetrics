import type { ReactNode } from "react"
import clsx from "clsx"
import styles from "./Toggle.module.css"

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  compact,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={clsx(styles.row, compact && styles.compact)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.desc}>{description}</span> : null}
      </span>
      <span className={styles.track} data-on={checked ? "true" : "false"}>
        <span className={styles.thumb} />
      </span>
    </button>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className={styles.field}>{children}</span>
}
