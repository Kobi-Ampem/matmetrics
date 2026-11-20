import { useState } from "react"
import clsx from "clsx"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Button } from "../../components/controls/Button"
import { Toggle } from "../../components/controls/Toggle"
import { PoseSkeleton } from "../../components/visuals/PoseSkeleton"
import { usePoseCamera, type CameraStatus } from "./usePoseCamera"
import styles from "../common.module.css"

const MESSAGES: Record<CameraStatus, string> = {
  idle: "Stand where the camera sees both of you.",
  loading: "Loading the pose model...",
  running: "",
  denied: "Camera access was blocked. Allow the camera in your browser's address bar, then press Start camera again.",
  unsupported: "This browser cannot open the camera here. Use a recent Chrome, Edge or Safari over HTTPS or localhost.",
  error: "The camera or pose model did not start. Check that no other app is using the camera and your connection is up, then try again.",
}

export default function CameraPage() {
  const { videoRef, status, frame, people, fps, start, stop } = usePoseCamera()
  const [showVideo, setShowVideo] = useState(false)
  const active = status === "loading" || status === "running"

  return (
    <AppShell theme="dark">
      <TopBar
        dark
        title="Live camera"
        center={status === "running" ? <span className={styles.rec}>LIVE</span> : null}
        actions={
          <>
            <Toggle compact label="Show video" checked={showVideo} onChange={setShowVideo} />
            {active ? (
              <Button variant="secondary" onClick={stop}>
                Stop camera
              </Button>
            ) : (
              <Button onClick={start} disabled={status === "unsupported"}>
                Start camera
              </Button>
            )}
          </>
        }
      />
      <div className={styles.grid2}>
        <div className={styles.camStage}>
          <div className={styles.camFrame}>
            <video
              ref={videoRef}
              className={clsx(styles.camVideo, showVideo && status === "running" && styles.camVideoOn)}
              muted
              playsInline
              aria-hidden="true"
            />
            <span className={styles.camGrid} aria-hidden="true" />
            <span className={styles.camPose}>
              <PoseSkeleton frame={frame} />
            </span>
            {status !== "running" ? (
              <p className={styles.camMessage} role="status">
                {MESSAGES[status]}
              </p>
            ) : null}
          </div>
        </div>
        <aside className={styles.stream}>
          <div className={styles.camPanel}>
            <span className="eyebrow">Tracking</span>
            <dl className={styles.camReadout}>
              <div>
                <dt>People</dt>
                <dd className="num">{status === "running" ? people : "–"}</dd>
              </div>
              <div>
                <dt>Frames per second</dt>
                <dd className="num">{status === "running" ? fps : "–"}</dd>
              </div>
            </dl>
            <p className={styles.camNote}>
              Works best with two people standing apart, facing the camera, with their whole bodies in view. Close
              grappling confuses the model.
            </p>
            <p className={styles.camNote}>
              The person on the left is drawn in blue, the person on the right in white.
            </p>
          </div>
          <div className={styles.latency}>
            <span className={styles.dot} style={{ margin: 0, width: 6, height: 6 }} />
            Video stays on this device. Nothing is recorded or uploaded.
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
