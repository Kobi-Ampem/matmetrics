import styles from "./Charts.module.css"

export function TimelineBar({
  steps,
}: {
  steps: { name: string; minutes: number; added: boolean }[]
}) {
  const total = steps.reduce((sum, step) => sum + step.minutes, 0) || 1
  return (
    <div>
      <div className={styles.bar} aria-label="Warm-up timeline">
        {steps.map((step, index) => (
          <div
            key={`${step.name}-${index}`}
            className={step.added ? `${styles.seg} ${styles.added}` : styles.seg}
            style={{ width: `${(step.minutes / total) * 100}%` }}
            title={`${step.name} · ${step.minutes} min`}
          >
            {step.minutes >= 2 ? <span>{step.minutes} min</span> : null}
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span><i className={styles.key} />Adjusted or added</span>
        <span><i />Standard</span>
      </div>
    </div>
  )
}
