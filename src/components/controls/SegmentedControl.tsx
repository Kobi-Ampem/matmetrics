import clsx from "clsx"
import styles from "./SegmentedControl.module.css"

interface Option<T extends string> {
  id: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={clsx(styles.item, option.id === value && styles.active)}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
