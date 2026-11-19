import clsx from "clsx"
import styles from "./Select.module.css"

interface Option {
  value: string
  label: string
}

export function Select({
  label,
  value,
  onChange,
  options,
  inline,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  inline?: boolean
}) {
  return (
    <label className={clsx(styles.wrap, inline && styles.inline)}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <select className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
