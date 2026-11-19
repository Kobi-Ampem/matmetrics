import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import type { Flag, Participation, Session } from "../../types"
import { mockDb } from "../../data"
import { DataTable, type Column } from "../../components/data/DataTable"
import { StatusTag } from "../../components/data/StatusTag"
import { Select } from "../../components/controls/Select"
import { SegmentedControl } from "../../components/controls/SegmentedControl"
import { Toggle } from "../../components/controls/Toggle"
import { Button } from "../../components/controls/Button"
import { formatDate } from "../../utils/format"
import { highestLevel, isRiskyLanding } from "../../utils/risk"
import styles from "../common.module.css"

export interface ReviewRow {
  key: string
  sessionId: string
  athleteId: string
  date: string
  dateLabel: string
  type: Session["type"]
  athlete: string
  minutes: number
  avgHr: number
  takedowns: string
  risky: number
  level: Flag["level"] | null
}

export function buildReviewRows(): ReviewRow[] {
  return mockDb.participations
    .map((row) => toRow(row))
    .filter((row): row is ReviewRow => row !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.athlete.localeCompare(b.athlete)))
}

function toRow(row: Participation): ReviewRow | null {
  const session = mockDb.sessions.find((item) => item.id === row.sessionId)
  const athlete = mockDb.athletes.find((item) => item.id === row.athleteId)
  if (!session || !athlete) return null
  const flags = mockDb.flags.filter((flag) => flag.sessionId === row.sessionId && flag.athleteId === row.athleteId)
  const risky = flags.filter(isRiskyLanding)
  return {
    key: `${row.sessionId}-${row.athleteId}`,
    sessionId: row.sessionId,
    athleteId: row.athleteId,
    date: session.date,
    dateLabel: formatDate(session.date),
    type: session.type,
    athlete: athlete.name,
    minutes: row.minutesOnMat,
    avgHr: row.avgHr,
    takedowns: `${row.takedownsCompleted} / ${row.takedownAttempts}`,
    risky: risky.length,
    level: highestLevel(flags.filter((flag) => flag.level !== "positive")),
  }
}

export function ReviewsTable({ lockedAthlete }: { lockedAthlete?: string }) {
  const navigate = useNavigate()
  const [athleteId, setAthleteId] = useState(lockedAthlete ?? "all")
  const [range, setRange] = useState<"7d" | "30d" | "12w">("12w")
  const [highOnly, setHighOnly] = useState(false)
  const [page, setPage] = useState(0)
  const all = useMemo(() => buildReviewRows(), [])
  const cutoff = range === "7d" ? "2026-11-10" : range === "30d" ? "2026-10-18" : "2026-08-01"
  const filtered = all.filter((row) => {
    if (lockedAthlete && row.athleteId !== lockedAthlete) return false
    if (!lockedAthlete && athleteId !== "all" && row.athleteId !== athleteId) return false
    if (row.date < cutoff) return false
    if (highOnly && row.level !== "high") return false
    return true
  })
  const start = page * 20
  const slice = filtered.slice(start, start + 20)
  const columns: Column<ReviewRow>[] = [
    { id: "date", header: "Date", sortValue: (row) => row.date, render: (row) => row.dateLabel },
    { id: "type", header: "Session", sortValue: (row) => row.type, render: (row) => row.type },
    { id: "athlete", header: "Athlete", sortValue: (row) => row.athlete, render: (row) => row.athlete },
    { id: "min", header: "On mat", numeric: true, sortValue: (row) => row.minutes, render: (row) => <span className="num">{row.minutes} min</span> },
    { id: "hr", header: "Avg HR", numeric: true, sortValue: (row) => row.avgHr, render: (row) => <span className="num">{row.avgHr}</span> },
    { id: "td", header: "Takedowns", numeric: true, render: (row) => <span className="num">{row.takedowns}</span> },
    { id: "risky", header: "Risky landings", numeric: true, sortValue: (row) => row.risky, render: (row) => <span className="num">{row.risky}</span> },
    { id: "flag", header: "Highest flag", sortValue: (row) => row.level ?? "", render: (row) => (row.level ? <StatusTag level={row.level} /> : "—") },
    {
      id: "open",
      header: "",
      numeric: true,
      render: (row) => (
        <Link
          to={`/coach/reviews/${row.sessionId}/${row.athleteId}`}
          onClick={(event) => event.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-ui)" }}
        >
          Open <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      ),
    },
  ]

  return (
    <div className="stack">
      <div className={styles.filters}>
        {lockedAthlete ? null : (
          <Select
            label="Athlete"
            value={athleteId}
            onChange={(value) => {
              setAthleteId(value)
              setPage(0)
            }}
            options={[{ value: "all", label: "All athletes" }, ...mockDb.athletes.map((athlete) => ({ value: athlete.id, label: athlete.name }))]}
          />
        )}
        <SegmentedControl
          label="Date range"
          value={range}
          onChange={(value) => {
            setRange(value)
            setPage(0)
          }}
          options={[
            { id: "7d", label: "7d" },
            { id: "30d", label: "30d" },
            { id: "12w", label: "12w" },
          ]}
        />
        <Toggle
          compact
          label="Only with high flags"
          checked={highOnly}
          onChange={(value) => {
            setHighOnly(value)
            setPage(0)
          }}
        />
      </div>
      <DataTable columns={columns} rows={slice} rowKey={(row) => row.key} onRowClick={(row) => navigate(`/coach/reviews/${row.sessionId}/${row.athleteId}`)} />
      <div className={styles.pager}>
        <Button variant="text" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
          Previous
        </Button>
        <span>
          {filtered.length === 0 ? "0" : `${start + 1}–${Math.min(start + 20, filtered.length)}`} of {filtered.length}
        </span>
        <Button variant="text" disabled={start + 20 >= filtered.length} onClick={() => setPage((value) => value + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
