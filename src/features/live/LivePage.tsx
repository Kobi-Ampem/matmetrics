import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { CameraFrame } from "../../components/visuals/CameraFrame"
import { MatDiagram } from "../../components/visuals/MatDiagram"
import { AlertRow } from "../../components/data/AlertRow"
import { Sparkline } from "../../components/data/Sparkline"
import { LoadBar } from "../../components/data/LoadBar"
import { Drawer } from "../../components/controls/Drawer"
import { SegmentedControl } from "../../components/controls/SegmentedControl"
import { Button } from "../../components/controls/Button"
import { Tabs } from "../../components/controls/Tabs"
import { athleteById, mockDb } from "../../data"
import { POSES } from "../../data/poses"
import { blockTitle } from "../../data/liveScript"
import { useLiveSession } from "../../state/LiveSessionContext"
import { useEdge } from "../../state/EdgeContext"
import { formatVideoTime } from "../../utils/format"
import type { Camera, Flag } from "../../types"
import { poseAt, usePoseClock } from "./poseClock"
import { RealCameraFrame } from "./RealCameraFrame"
import styles from "../common.module.css"

export function LivePage() {
  const { state, dispatch } = useLiveSession()
  const { status: edgeStatus, watchCameras } = useEdge()
  // Real cameras need the edge server; without it the scripted views are the only option.
  const real = edgeStatus === "online" && state.cameraMode === "real"
  const [filter, setFilter] = useState("all")
  const [enlarged, setEnlarged] = useState<Camera["id"] | null>(null)
  const [open, setOpen] = useState<Flag | null>(null)
  const time = usePoseClock(true)
  const cameras = mockDb.cameras.map((camera) => {
    const blocked = camera.id === "cam4" && state.elapsedSec >= 50 * 60 && state.elapsedSec < 54 * 60
    return { ...camera, status: blocked ? "warning" as const : camera.id === "cam4" ? "online" as const : camera.status }
  })

  useEffect(() => {
    if (!real) return
    watchCameras(true)
    return () => watchCameras(false)
  }, [real, watchCameras])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (event.code === "Space") {
        event.preventDefault()
        dispatch({ type: "TOGGLE_RUNNING" })
      }
      if (event.key === "1") dispatch({ type: "SET_SPEED", speed: 1 })
      if (event.key === "2") dispatch({ type: "SET_SPEED", speed: 4 })
      if (event.key === "3") dispatch({ type: "SET_SPEED", speed: 16 })
      if (event.key.toLowerCase() === "f") {
        const flagged = state.activeFlags[0]?.cameras[0]
        setEnlarged(flagged ?? "cam1")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dispatch, state.activeFlags])

  const alerts = state.alerts.filter((alert) => {
    if (filter === "high") return alert.level === "high"
    if (filter === "unseen") return !state.seen[alert.id]
    return true
  })
  const big = enlarged ? cameras.find((camera) => camera.id === enlarged) : null

  function cameraView(camera: Camera, options: { size?: "strip"; offset?: number; onClick: () => void }) {
    if (real) {
      return <RealCameraFrame key={camera.id} camera={camera} flag={flagOn(camera.id, state)} size={options.size} onClick={options.onClick} />
    }
    return (
      <CameraFrame
        key={camera.id}
        camera={camera}
        pose={frameFor(camera.id, time + (options.offset ?? 0), state.activeFlags)}
        flag={flagOn(camera.id, state)}
        size={options.size}
        status={camera.status}
        onClick={options.onClick}
      />
    )
  }

  return (
    <AppShell theme="dark">
      <TopBar
        dark
        title={state.ended ? "Session ended" : blockTitle(state.elapsedSec)}
        center={
          <>
            <span className={styles.clock}>{formatVideoTime(state.elapsedSec)}</span>
            {state.ended ? <span className={styles.paused}>ENDED</span> : state.running ? <span className={styles.rec}>REC</span> : <span className={styles.paused}>PAUSED</span>}
          </>
        }
        actions={
          <>
            <span className={styles.matLabel}>Mat 1</span>
            <Button variant="secondary" onClick={() => dispatch({ type: "TOGGLE_RUNNING" })}>
              {state.running ? "Pause" : "Resume"}
            </Button>
            <SegmentedControl
              label="Playback speed"
              value={String(state.speed)}
              onChange={(value) => dispatch({ type: "SET_SPEED", speed: Number(value) as 1 | 4 | 16 })}
              options={[
                { id: "1", label: "1×" },
                { id: "4", label: "4×" },
                { id: "16", label: "16×" },
              ]}
            />
            <Button variant="secondary" onClick={() => dispatch({ type: "END" })}>
              End session
            </Button>
          </>
        }
      />
      <div className={styles.grid2}>
        <div>
          <div className={styles.camHead}>
            <p className={styles.hint}>
              <span><kbd>Space</kbd>pause</span>
              <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>speed</span>
              <span><kbd>F</kbd>enlarge flagged camera</span>
            </p>
            {edgeStatus === "online" ? (
              <SegmentedControl
                label="Camera source"
                value={state.cameraMode}
                onChange={(mode) => dispatch({ type: "SET_CAMERA_MODE", mode })}
                options={[
                  { id: "simulated", label: "Simulated" },
                  { id: "real", label: "Real cameras" },
                ]}
              />
            ) : null}
          </div>
          {big ? (
            <>
              <div className={styles.cams} style={{ gridTemplateColumns: "1fr" }}>
                {cameraView(big, { onClick: () => setEnlarged(null) })}
              </div>
              <div className={`${styles.strip} ${styles.liveStrip}`}>
                {cameras
                  .filter((camera) => camera.id !== big.id)
                  .map((camera) => cameraView(camera, { size: "strip", onClick: () => setEnlarged(camera.id) }))}
              </div>
            </>
          ) : (
            <div className={styles.cams}>
              {cameras.map((camera, index) =>
                cameraView(camera, { offset: index * 0.4, onClick: () => setEnlarged(camera.id) }),
              )}
            </div>
          )}
          <div className={styles.railHead}>
            <span className="eyebrow">On the mat · {state.pairs.length} pairs</span>
            <span className={styles.sub}>Heart rate · skin temp · load</span>
          </div>
          <div className={styles.rail}>
            {state.pairs.map((pair) => {
              const a = athleteById(pair.a)
              const b = athleteById(pair.b)
              const va = state.vitals[pair.a]
              const vb = state.vitals[pair.b]
              return (
                <div key={pair.id} className={styles.pair}>
                  <strong title={`${a?.name} · ${b?.name}`}>{a?.name.split(" ")[0]} · {b?.name.split(" ")[0]}</strong>
                  <div className={styles.pairNums}>
                    <span><b className={va && va.hr > 175 ? styles.hrHot : undefined}>{va?.hr ?? "–"}</b> bpm</span>
                    <span><b className={vb && vb.hr > 175 ? styles.hrHot : undefined}>{vb?.hr ?? "–"}</b> bpm</span>
                  </div>
                  <Sparkline values={va?.history ?? []} tone="light" />
                  <div className={styles.pairNums}>
                    <span>{va?.skinTemp.toFixed(1)} °C</span>
                    <span>{vb?.skinTemp.toFixed(1)} °C</span>
                  </div>
                  <LoadBar value={va?.load ?? 0} />
                </div>
              )
            })}
          </div>
        </div>
        <aside className={styles.stream}>
          <div className={styles.streamHead}>
            <div className={styles.streamTitle}>
              <span className="eyebrow">Alerts</span>
              <span className="num">{state.alerts.length} today · {state.alerts.filter((alert) => !state.seen[alert.id]).length} unseen</span>
            </div>
            <MatDiagram
              tone="dark"
              cameras={mockDb.cameras.map((camera) => ({ ...camera, status: camera.id === "cam4" && state.elapsedSec >= 50 * 60 && state.elapsedSec < 54 * 60 ? "warning" : "online" }))}
              pairs={state.pairs.map((pair) => ({ id: pair.id, x: pair.x, y: pair.y, alert: state.pulsedPairs.some((item) => item.id === pair.id) }))}
            />
            <Tabs
              tabs={[
                { id: "all", label: "All" },
                { id: "high", label: "High" },
                { id: "unseen", label: "Unseen" },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className={styles.alerts} aria-live="polite">
            {alerts.length === 0 ? <p className={styles.empty}>No alerts in this view.</p> : null}
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                variant="dark"
                seen={Boolean(state.seen[alert.id])}
                actions={
                  <>
                    <button type="button" className={styles.darkLink} onClick={() => setOpen(alert)}>Review clip</button>
                    <button type="button" className={styles.darkLink} onClick={() => dispatch({ type: "MARK_SEEN", id: alert.id })}>Mark as seen</button>
                  </>
                }
              />
            ))}
          </div>
          <div className={styles.latency}>
            <span className={styles.dot} style={{ margin: 0, width: 6, height: 6 }} />
            Edge unit 30 fps · latency {(state.latencyMs / 1000).toFixed(1)} s
          </div>
        </aside>
      </div>
      <Drawer open={Boolean(open)} onClose={() => setOpen(null)} title="Review clip">
        {open ? (
          <div className="stack">
            <CameraFrame camera={mockDb.cameras[0]!} pose={POSES.landing} flag={open.cameras.length ? open : undefined} />
            <p>{open.description}</p>
            <p className="num">{open.clock} · {open.level.toUpperCase()}</p>
            <Link to={`/coach/reviews/${open.sessionId}/${open.athleteId}`}>Open full review</Link>
          </div>
        ) : null}
      </Drawer>
    </AppShell>
  )
}

function flagOn(id: Camera["id"], state: ReturnType<typeof useLiveSession>["state"]): Flag | undefined {
  const active = state.activeFlags.find((item) => item.cameras.includes(id))
  if (!active) return undefined
  return state.alerts.find((alert) => alert.id === active.flagId)
}

function frameFor(id: Camera["id"], time: number, active: { cameras: Camera["id"][] }[]) {
  if (active.some((item) => item.cameras.includes(id))) return POSES.landing
  const offset = id === "cam1" ? 0 : id === "cam2" ? 0.8 : id === "cam3" ? 1.4 : 2
  return poseAt(time, offset)
}
