import { useEffect, useState } from "react"
import { useEdge } from "../../state/EdgeContext"
import styles from "./JoinPanel.module.css"

const BASE = (import.meta.env.VITE_EDGE_URL as string | undefined)?.replace(/\/$/, "") ?? ""

interface Join {
  url: string
  svg: string
  cameraUrl: string | null
  cameraSvg: string | null
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
    <section className={styles.panel}>
      <div className={styles.wrap}>
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
      </div>
      {join.cameraUrl && join.cameraSvg ? (
        <div className={styles.wrap}>
          <div className={styles.code} dangerouslySetInnerHTML={{ __html: join.cameraSvg }} />
          <div>
            <div className="eyebrow">Mat cameras</div>
            <h2 className="section-title">Use this phone as a camera</h2>
            <p className="muted">
              Opens the camera page over a secure link. The phone shows a one-time warning about the edge unit's own
              certificate: tap Advanced, then continue. Pick the phone's position around the mat and start.
            </p>
            <p className={styles.url}>{join.cameraUrl}</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
