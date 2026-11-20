import { useState } from "react"
import clsx from "clsx"
import { Button } from "../../components/controls/Button"
import { SegmentedControl } from "../../components/controls/SegmentedControl"
import { PoseSkeleton } from "../../components/visuals/PoseSkeleton"
import { mockDb } from "../../data"
import type { Camera } from "../../types"
import { useCameraNode } from "./useCameraNode"
import styles from "./CameraNodePage.module.css"

const CAM_KEY = "matmetrics-camera-node"

function savedCam(): Camera["id"] {
  try {
    const value = localStorage.getItem(CAM_KEY)
    if (value === "cam1" || value === "cam2" || value === "cam3" || value === "cam4") return value
  } catch {
    // Private browsing can block storage; CAM 1 is fine.
  }
  return "cam1"
}

// A phone on a tripod at the edge of the mat. It opens this page from the camera QR code on
// the coach's System page and becomes one of the four cameras on the live screen.
export function CameraNodePage() {
  const [cam, setCam] = useState<Camera["id"]>(savedCam)
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const { videoRef, status, preview, people, stats, edgeOk, start, stop } = useCameraNode()
  const active = status === "loading" || status === "running"
  const camera = mockDb.cameras.find((item) => item.id === cam)

  function choose(next: Camera["id"]) {
    setCam(next)
    try {
      localStorage.setItem(CAM_KEY, next)
    } catch {
      // Not remembering the choice is fine.
    }
  }

  let line = "Pick this phone's position around the mat, then start."
  if (status === "unsupported") line = "This page needs the https link. Scan the camera QR code on the coach's System page."
  if (status === "denied") line = "Camera access was blocked. Allow the camera for this site, then start again."
  if (status === "error") line = "The camera or pose model did not start. Check no other app is using the camera."
  if (status === "loading") line = "Starting the camera and the pose model..."
  let warning = ""
  if (status === "running") {
    line =
      edgeOk === false
        ? "Cannot reach the edge unit. Check this phone is on the club Wi-Fi."
        : `Sending · skeleton ${stats.poseFps} fps · video ${stats.imageFps} fps · ${people} ${people === 1 ? "person" : "people"}`
    if (stats.portrait) warning = "Turn the phone sideways: the coach screen shows a wide picture."
    else if (stats.moving) warning = "Phone moving. Alerts from this camera pause until it is still."
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <div className={styles.word}>MatMetrics camera</div>
          <div className={clsx(styles.state, status === "running" && edgeOk !== false && styles.live)}>
            {camera?.label ?? cam}
          </div>
        </div>
        {active ? (
          <Button variant="secondary" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button onClick={() => void start(cam, facing)} disabled={status === "unsupported"}>
            Start camera
          </Button>
        )}
      </header>

      {!active ? (
        <div className={styles.controls}>
          <SegmentedControl
            label="Camera position"
            value={cam}
            onChange={choose}
            options={mockDb.cameras.map((item) => ({ id: item.id, label: item.label.replace("CAM ", "") }))}
          />
          <SegmentedControl
            label="Which lens"
            value={facing}
            onChange={setFacing}
            options={[
              { id: "environment", label: "Back lens" },
              { id: "user", label: "Front lens" },
            ]}
          />
        </div>
      ) : null}

      <div className={styles.frame}>
        <video ref={videoRef} className={styles.video} muted playsInline aria-hidden="true" />
        <span className={styles.pose}>
          <PoseSkeleton frame={preview} />
        </span>
      </div>

      <p className={styles.line} role="status">
        {line}
      </p>
      {warning ? <p className={styles.warning}>{warning}</p> : null}
      <p className={styles.tip}>
        Place the phone at chest height, a few metres from the mat edge, in landscape, so both wrestlers are fully in
        view. Keep this page open; the screen stays on while it runs.
      </p>
    </main>
  )
}
