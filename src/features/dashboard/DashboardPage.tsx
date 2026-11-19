import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { StatRow } from "../../components/data/StatRow"
import { DataTable, type Column } from "../../components/data/DataTable"
import { StatusTag } from "../../components/data/StatusTag"
import { LoadBar } from "../../components/data/LoadBar"
import { AlertRow } from "../../components/data/AlertRow"
import { Tabs } from "../../components/controls/Tabs"
import { Button } from "../../components/controls/Button"
import { BarChartPanel } from "../../components/charts/Charts"
import { mockDb, sessionById } from "../../data"
import { DEMO_SESSION_ID, DEMO_TODAY } from "../../types"
import { onMatIds, useLiveSession } from "../../state/LiveSessionContext"
import { formatDate } from "../../utils/format"
import { highestLevel, zoneGroup } from "../../utils/risk"
import styles from "../common.module.css"
import { Link } from "react-router-dom"

interface Row {
  id: string
  name: string
  meta: string
  hr: number
  temp: number
  load: number
  flags: number
  level: "high" | "med" | "low" | "positive" | null
  battery: number
  onMat: boolean
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { state } = useLiveSession()
  const [filter, setFilter] = useState("all")
  const onMat = onMatIds(state.pairs)
  const session = sessionById(DEMO_SESSION_ID)

  const rows = useMemo(() => {
    return mockDb.athletes.map((athlete) => {
      const part = mockDb.participations.find((item) => item.sessionId === DEMO_SESSION_ID && item.athleteId === athlete.id)
      const flags = state.alerts.filter((alert) => alert.athleteId === athlete.id && alert.level !== "positive")
      const device = mockDb.devices.find((item) => item.athleteId === athlete.id)
      const vitals = state.vitals[athlete.id]
      return {
        id: athlete.id,
        name: athlete.name,
        meta: `${athlete.style} · ${athlete.level}`,
        hr: onMat.has(athlete.id) ? vitals?.hr ?? part?.avgHr ?? 0 : part?.avgHr ?? 0,
        temp: vitals?.skinTemp ?? athlete.baselineSkinTemp,
        load: part?.load ?? 0,
        flags: flags.length,
        level: highestLevel(flags),
        battery: device?.battery ?? 0,
        onMat: onMat.has(athlete.id),
      } satisfies Row
    })
  }, [onMat, state.alerts, state.vitals])

  const visible = rows.filter((row) => {
    if (filter === "mat") return row.onMat
    if (filter === "flagged") return row.flags > 0
    if (filter === "load") return row.load >= 80
    return true
  })

  const columns: Column<Row>[] = [
    { id: "name", header: "Athlete", sortValue: (row) => row.name, render: (row) => (<span className={styles.person}><b>{row.name}</b><small>{row.meta}</small></span>) },
    { id: "hr", header: "HR", numeric: true, sortValue: (row) => row.hr, render: (row) => <span className="num">{row.hr} bpm</span> },
    { id: "temp", header: "Skin", numeric: true, sortValue: (row) => row.temp, render: (row) => <span className="num">{row.temp.toFixed(1)} °C</span> },
    { id: "load", header: "Load", numeric: true, sortValue: (row) => row.load, render: (row) => <LoadBar value={row.load} /> },
    {
      id: "flags",
      header: "Flags today",
      numeric: true,
      sortValue: (row) => (row.level === "high" ? 300 : row.level === "med" ? 200 : row.level === "low" ? 100 : 0) + row.flags,
      render: (row) => (row.level ? <StatusTag level={row.level}>{`${row.level} · ${row.flags}`}</StatusTag> : <span className="num">0</span>),
    },
    { id: "battery", header: "Band", numeric: true, sortValue: (row) => row.battery, render: (row) => <span className="num">{row.battery}%</span> },
  ]

  const risky = state.alerts.filter((alert) => alert.level !== "positive")
  const high = risky.filter((alert) => alert.level === "high").length
  const hrs = [...onMat].map((id) => state.vitals[id]?.hr ?? 0)
  const avg = hrs.length ? Math.round(hrs.reduce((sum, value) => sum + value, 0) / hrs.length) : 0

  const loadData = rows.map((row) => ({
    label: row.name.split(" ").map((part) => part[0]).join(""),
    name: row.name,
    value: row.load,
  }))
  const since = "2026-10-18"
  const zoneMap = new Map<string, number>()
  for (const label of ["Head / neck", "Shoulder", "Back", "Hip", "Knee", "Ankle", "Mat edge"]) zoneMap.set(label, 0)
  for (const flag of mockDb.flags) {
    const date = sessionById(flag.sessionId)?.date
    if (!date || date < since || date > DEMO_TODAY || flag.level === "positive") continue
    const group = zoneGroup(flag.zone, flag.kind)
    const label =
      group === "head_neck" ? "Head / neck" : group === "mat_edge" ? "Mat edge" : group === "other" ? "" : group.charAt(0).toUpperCase() + group.slice(1)
    if (!label || !zoneMap.has(label)) continue
    zoneMap.set(label, (zoneMap.get(label) ?? 0) + 1)
  }

  return (
    <AppShell>
      <TopBar
        title="Today"
        actions={
          <>
            <span className={state.ended ? `${styles.livePill} ${styles.ended}` : styles.livePill}><i />{state.ended ? "Session ended" : "Session live"}</span>
            <Button to="/coach/live">Open live session</Button>
          </>
        }
        breadcrumb={`${formatDate(DEMO_TODAY)} · ${session?.type ?? "Live sparring"}`}
      />
      <div className="page stack-lg">
        <StatRow
          items={[
            { label: "Athletes on mat", value: String(onMat.size) },
            { label: "Flags today", value: String(risky.length), delta: `${high} high`, tone: high ? "risk" : "default" },
            { label: "Avg heart rate", value: String(avg), unit: "bpm" },
            { label: "Room", value: `${session?.roomTempC ?? 19.5}`, unit: `°C · ${session?.humidity ?? 48}%` },
          ]}
        />
        <div className="split" style={{ ["--split" as string]: "minmax(0, 1.75fr) minmax(300px, 0.85fr)" }}>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Team</h2>
              <small>{visible.length} of {rows.length} athletes · click a row for the profile</small>
            </div>
            <Tabs
              tabs={[
                { id: "all", label: "All" },
                { id: "mat", label: "On mat" },
                { id: "flagged", label: "Flagged" },
                { id: "load", label: "High load" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <DataTable columns={columns} rows={visible} rowKey={(row) => row.id} onRowClick={(row) => navigate(`/coach/athletes/${row.id}`)} initialSort={{ id: "flags", dir: "desc" }} />
          </section>
          <aside className="pane">
            <div className="section-head">
              <h2 className="section-title">Latest alerts</h2>
              <Link to="/coach/live" style={{ fontSize: 13 }}>View all</Link>
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {state.alerts.slice(0, 8).map((alert) => (
                <AlertRow key={alert.id} alert={alert} variant="light" seen={state.seen[alert.id]} />
              ))}
            </div>
          </aside>
        </div>
        <div className="split" style={{ ["--split" as string]: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Load this week</h2>
              <small>0–100 · high above 85</small>
            </div>
            <BarChartPanel data={loadData} hotAbove={85} height={260} />
          </section>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Flags by body zone</h2>
              <small>Last 30 days</small>
            </div>
            <BarChartPanel horizontal data={[...zoneMap.entries()].map(([label, value]) => ({ label, value }))} height={260} unit="flags" />
          </section>
        </div>
      </div>
    </AppShell>
  )
}
