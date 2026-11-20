import { mockDb } from "../../data"
import { useEdge } from "../../state/EdgeContext"
import styles from "./NetworkStatus.module.css"

export function NetworkStatus() {
  const { status } = useEdge()
  return (
    <div className={styles.wrap}>
      <span className={styles.dot} aria-hidden="true" />
      <div>
        <div className={styles.title}>Local network</div>
        <div className={styles.detail}>
          {status === "online"
            ? "Edge unit connected · Live sync on · Internet off"
            : `Edge unit ${mockDb.network.edgeOnline ? "online" : "offline"} · Internet off · Sync paused`}
        </div>
      </div>
    </div>
  )
}
