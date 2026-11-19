import { useEffect, useState } from "react"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Button } from "../../components/controls/Button"
import { DataTable, type Column } from "../../components/data/DataTable"
import { StatusTag } from "../../components/data/StatusTag"
import { LoadBar } from "../../components/data/LoadBar"
import { MatDiagram } from "../../components/visuals/MatDiagram"
import { LineChartPanel } from "../../components/charts/Charts"
import { mockDb } from "../../data"
import { useSettings } from "../../state/SettingsContext"
import type { Device } from "../../types"
import styles from "../common.module.css"

export function SystemPage() {
  const { calibrationAt, setCalibrationNow, syncWaiting, requestSync } = useSettings()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const devices = mockDb.devices.filter((device) => device.kind !== "band")
  const bands = mockDb.devices.filter((device) => device.kind === "band")

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const id = window.setInterval(() => {
      const value = Math.min(1, (Date.now() - start) / 5000)
      setProgress(value)
      if (value >= 1) {
        window.clearInterval(id)
        setRunning(false)
        setCalibrationNow()
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [running, setCalibrationNow])

  const columns: Column<Device>[] = [
    { id: "label", header: "Device", sortValue: (row) => row.label, render: (row) => <b style={{ fontWeight: 500 }}>{row.label}</b> },
    { id: "kind", header: "Kind", sortValue: (row) => row.kind, render: (row) => <span className="muted" style={{ textTransform: "capitalize" }}>{row.kind}</span> },
    { id: "status", header: "Status", render: (row) => <StatusTag level={row.status === "online" ? "ok" : row.status === "warning" ? "med" : "low"}>{row.status}</StatusTag> },
    { id: "detail", header: "Detail", render: (row) => <span className="muted">{row.detail}</span> },
    { id: "seen", header: "Last seen", numeric: true, render: (row) => <span className="num">{row.lastSeen}</span> },
  ]

  return (
    <AppShell>
      <TopBar
        title="System"
        actions={
          <Button variant="secondary" onClick={requestSync}>
            {syncWaiting ? "Waiting for internet" : "Sync when online"}
          </Button>
        }
      />
      <div className="page stack-lg">
        <div className={styles.banner}>
          <div>
            <strong><span className={styles.dot} />Running on local network</strong>
            <p>Internet off · Cloud sync paused · {mockDb.network.sessionsWaiting} sessions waiting</p>
          </div>
          <StatusTag level="ok">All core devices online</StatusTag>
        </div>

        <section className={styles.systemTop}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Mat 1 · cameras</div>
            <MatDiagram cameras={mockDb.cameras} />
          </div>
          <div>
            <div className="section-head">
              <h2 className="section-title">Devices</h2>
              <small>{devices.length} on the club network</small>
            </div>
            <DataTable columns={columns} rows={devices} rowKey={(row) => row.id} />
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">Wristbands</h2>
            <small>{bands.length} paired · {bands.filter((band) => (band.battery ?? 0) < 50).length} below 50%</small>
          </div>
          <div className={styles.bands} style={{ borderTop: "1px solid var(--line)" }}>
            {bands.map((band) => (
              <div key={band.id} className={styles.band}>
                <span className="num">{band.label}</span>
                <span>
                  <b>{band.detail}</b>
                  <small>
                    Seen {band.lastSeen} · fw {band.firmware}
                    {band.updateAvailable ? <span className={styles.update}> · Update available</span> : null}
                  </small>
                </span>
                <LoadBar value={band.battery ?? 0} warnBelow={50} />
              </div>
            ))}
          </div>
        </section>

        <div className="split" style={{ ["--split" as string]: "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <section className="pane stack" style={{ gap: 16 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <h2 className="section-title">Calibration</h2>
              <small>Last run {calibrationAt ? `today ${calibrationAt}` : "Tue 12 Nov"}</small>
            </div>
            <p className="muted">Room temperature, humidity and light change sensor readings. Calibrating per room keeps alerts reliable.</p>
            <div className={styles.rooms}>
              {mockDb.rooms.map((room, index) => (
                <div key={room.id} className={index === 0 ? styles.roomOn : undefined}>
                  <b>{room.name}</b>
                  <span className="num">{room.minC}–{room.maxC} °C</span>
                </div>
              ))}
            </div>
            <div>
              <Button onClick={() => { setProgress(0); setRunning(true) }} disabled={running}>
                {running ? `Calibrating ${Math.round(progress * 100)}%` : "Run calibration"}
              </Button>
              {running ? (
                <div className={styles.progress} aria-label="Calibration progress">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              ) : null}
            </div>
          </section>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Processing rate</h2>
              <small>fps · last 60 min</small>
            </div>
            <LineChartPanel data={mockDb.fps.map((value, index) => ({ label: `${index - 59}m`, value }))} unit="fps" height={200} />
          </section>
        </div>
      </div>
    </AppShell>
  )
}
