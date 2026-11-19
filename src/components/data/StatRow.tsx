import styles from "./StatRow.module.css"

export interface StatItem {
  label: string
  value: string
  unit?: string
  delta?: string
  tone?: "ok" | "risk" | "default"
}

export function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div className={styles.row}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <div className="eyebrow">{item.label}</div>
          <div className={styles.value}>
            <span className="num">{item.value}</span>
            {item.unit ? <span className={styles.unit}>{item.unit}</span> : null}
          </div>
          {item.delta ? (
            <div className={styles.delta} data-tone={item.tone ?? "default"}>
              {item.delta}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
