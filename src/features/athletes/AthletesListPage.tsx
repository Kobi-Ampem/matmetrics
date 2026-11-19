import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { DataTable, type Column } from "../../components/data/DataTable"
import { Sparkline } from "../../components/data/Sparkline"
import { Tabs } from "../../components/controls/Tabs"
import { mockDb } from "../../data"
import { formatDate, round1 } from "../../utils/format"
import { isRiskyLanding } from "../../utils/risk"
import styles from "../common.module.css"

interface Row {
  id: string
  name: string
  initials: string
  weight: string
  style: string
  level: string
  sessions: number
  risky: number
  series: number[]
  trend: number
  load: number
  last: string
}

export function AthletesListPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [level, setLevel] = useState("All")
  const rows = useMemo(() => {
    return mockDb.athletes.map((athlete) => {
      const weekly = mockDb.weekly.filter((item) => item.athleteId === athlete.id).sort((a, b) => a.weekIndex - b.weekIndex)
      const parts = mockDb.participations.filter((item) => item.athleteId === athlete.id)
      const flags = mockDb.flags.filter((item) => item.athleteId === athlete.id && isRiskyLanding(item))
      const first = weekly[0]?.riskyLandingsPerSession ?? 0
      const last = weekly[weekly.length - 1]?.riskyLandingsPerSession ?? 0
      const trend = first === 0 ? 0 : Math.round(((last - first) / first) * 100)
      const recent = parts.filter((item) => {
        const date = mockDb.sessions.find((session) => session.id === item.sessionId)?.date ?? ""
        return date >= "2026-11-10"
      })
      const load = recent.length ? Math.round(recent.reduce((sum, item) => sum + item.load, 0) / recent.length) : 0
      const lastDate = parts
        .map((item) => mockDb.sessions.find((session) => session.id === item.sessionId)?.date ?? "")
        .sort()
        .at(-1)
      return {
        id: athlete.id,
        name: athlete.name,
        initials: athlete.initials,
        weight: `${athlete.weightKg} kg`,
        style: athlete.style,
        level: athlete.level,
        sessions: parts.length,
        risky: parts.length ? round1(flags.length / parts.length) : 0,
        series: weekly.map((item) => item.riskyLandingsPerSession),
        trend,
        load,
        last: lastDate ? formatDate(lastDate) : "—",
      } satisfies Row
    })
  }, [])
  const visible = rows.filter((row) => {
    if (level !== "All" && row.level !== level) return false
    return row.name.toLowerCase().includes(query.trim().toLowerCase())
  })
  const columns: Column<Row>[] = [
    {
      id: "name",
      header: "Athlete",
      sortValue: (row) => row.name,
      render: (row) => (
        <span className={styles.who}>
          <span className={styles.avatar}>{row.initials}</span>
          {row.name}
        </span>
      ),
    },
    { id: "weight", header: "Weight", sortValue: (row) => row.weight, render: (row) => row.weight },
    { id: "style", header: "Style", sortValue: (row) => row.style, render: (row) => row.style },
    { id: "level", header: "Level", sortValue: (row) => row.level, render: (row) => row.level },
    { id: "sessions", header: "Sessions", numeric: true, sortValue: (row) => row.sessions, render: (row) => <span className="num">{row.sessions}</span> },
    {
      id: "risky",
      header: "Risky / session",
      numeric: true,
      sortValue: (row) => row.risky,
      render: (row) => (
        <span className={styles.who}>
          <span className="num">{row.risky.toFixed(1)}</span>
          <Sparkline values={row.series} tone={row.trend < 0 ? "ok" : "risk"} />
        </span>
      ),
    },
    {
      id: "trend",
      header: "Trend",
      numeric: true,
      sortValue: (row) => row.trend,
      render: (row) => (
        <span className="num" style={{ color: row.trend < 0 ? "var(--ok)" : row.trend > 0 ? "var(--risk-med)" : "inherit" }}>
          {row.trend > 0 ? "+" : ""}
          {row.trend}%
        </span>
      ),
    },
    { id: "load", header: "Load 7d", numeric: true, sortValue: (row) => row.load, render: (row) => <span className="num">{row.load}</span> },
    { id: "last", header: "Last session", sortValue: (row) => row.last, render: (row) => row.last },
  ]
  return (
    <AppShell>
      <TopBar title="Athletes" />
      <div className="page stack">
        <div className={styles.filters}>
          <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" aria-label="Search athletes" />
          <Tabs
            tabs={["All", "Competitive", "Intermediate", "Beginner"].map((id) => ({ id, label: id }))}
            value={level}
            onChange={setLevel}
          />
        </div>
        <DataTable columns={columns} rows={visible} rowKey={(row) => row.id} onRowClick={(row) => navigate(`/coach/athletes/${row.id}`)} />
      </div>
    </AppShell>
  )
}
