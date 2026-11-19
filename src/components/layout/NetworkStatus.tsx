import { mockDb } from "../../data"
import styles from "./NetworkStatus.module.css"

export function NetworkStatus() {
  return (
    <div className={styles.wrap}>
      <span className={styles.dot} aria-hidden="true" />
      <div>
        <div className={styles.title}>Local network</div>
        <div className={styles.detail}>
          Edge unit {mockDb.network.edgeOnline ? "online" : "offline"} · Internet off · Sync paused
        </div>
      </div>
    </div>
  )
}
