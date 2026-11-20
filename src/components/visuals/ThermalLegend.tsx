import styles from "./ThermalLegend.module.css"

export function ThermalLegend() {
  return (
    <div className={styles.legend}>
      <span className={styles.bar} aria-hidden="true" />
      <span className="num">31°C — 36°C</span>
      <span className={styles.cap}>Relative skin temperature. Not a medical reading.</span>
    </div>
  )
}
