import { useEffect, useState } from "react"
import { useEdge } from "../../state/EdgeContext"
import styles from "./JoinPanel.module.css"

const BASE = (import.meta.env.VITE_EDGE_URL as string | undefined)?.replace(/\/$/, "") ?? ""

interface Join {
  url: string
  svg: string
}

// Shown only when an edge server is running: phones on the same Wi-Fi scan the code to open
// the athlete app, and from then on they follow the coach's screen.
export function JoinPanel() {
  const { status } = useEdge()
  const [join, setJoin] = useState<Join | null>(null)

  useEffect(() => {
    if (status !== "online") return
    let cancelled = false
    fetch(`${BASE}/api/join`)
      .then((response) => response.json() as Promise<Join>)
      .then((body) => {
        if (!cancelled) setJoin(body)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [status])

  if (status !== "online" || !join) return null

  return (
    <section className={styles.wrap}>
      <div className={styles.code} dangerouslySetInnerHTML={{ __html: join.svg }} />
      <div>
        <div className="eyebrow">Join from a phone</div>
        <h2 className="section-title">Scan to open the athlete app</h2>
        <p className="muted">
          Phones on the club Wi-Fi connect straight to the edge unit. No internet needed. Changes made on any
          screen show on all of them.
        </p>
        <p className={styles.url}>{join.url}</p>
      </div>
    </section>
  )
}
