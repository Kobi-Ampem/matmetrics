import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Tabs } from "../../components/controls/Tabs"
import { SegmentedControl } from "../../components/controls/SegmentedControl"
import { Button } from "../../components/controls/Button"
import { BarChartPanel, LineChartPanel } from "../../components/charts/Charts"
import { BodyMap } from "../../components/visuals/BodyMap"
import { StatusTag } from "../../components/data/StatusTag"
import { ReviewsTable } from "../reviews/ReviewsTable"
import { athleteById, mockDb, thermalCaption, thermalZones } from "../../data"
import { formatMonthYear } from "../../utils/format"
import { useSettings } from "../../state/SettingsContext"
import { theme } from "../../styles/theme"
import styles from "../common.module.css"

export function AthleteProfilePage() {
  const { athleteId = "" } = useParams()
  const athlete = athleteById(athleteId)
  const [tab, setTab] = useState("overview")
  const [range, setRange] = useState<"4" | "8" | "12">("12")
  const settings = useSettings()
  if (!athlete) {
    return (
      <AppShell>
        <div className="page">
          <p>Athlete not found.</p>
          <Link to="/coach/athletes">Back to athletes</Link>
        </div>
      </AppShell>
    )
  }
  const weekly = mockDb.weekly.filter((item) => item.athleteId === athlete.id).sort((a, b) => a.weekIndex - b.weekIndex)
  const slice = weekly.slice(-Number(range))
  const first = slice[0]
  const last = slice[slice.length - 1]
  const pct = first && last && first.riskyLandingsPerSession > 0
    ? Math.round(((last.riskyLandingsPerSession - first.riskyLandingsPerSession) / first.riskyLandingsPerSession) * 100)
    : 0
  const zones = thermalZones(athlete)
  const plan = settings.planFor(athlete.id)
  const consent = settings.consentFor(athlete.id)

  return (
    <AppShell>
      <TopBar
        title="Athlete profile"
        breadcrumb={
          <>
            <Link to="/coach/athletes">Athletes</Link>
            <span>/</span>
            <span>{athlete.name}</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" to={`/coach/warmups?athlete=${athlete.id}`}>Warm-up plan</Button>
            <Button to={`/coach/reviews/s2026-11-17/${athlete.id}`}>Last review</Button>
          </>
        }
      />
      <div className="page stack">
        <header className={styles.profileHead}>
          <div className={styles.who}>
            <span className={`${styles.avatar} ${styles.avatarLg}`}>{athlete.initials}</span>
            <div>
              <h2 className="page-title">{athlete.name}</h2>
              <p>
                {athlete.weightKg} kg · {athlete.style} · {athlete.level} · Member since {formatMonthYear(athlete.memberSince)}
              </p>
            </div>
          </div>
        </header>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "sessions", label: "Sessions" },
            { id: "warmups", label: "Warm-ups" },
            { id: "sharing", label: "Data sharing" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "overview" ? (
          <div className="stack-lg">
            <div className={styles.headline}>
              <div>
                <p className={styles.insight}>
                  {pct < 0 ? `Risky landings down ${Math.abs(pct)}% in ${range} weeks` : pct > 0 ? `Risky landings up ${pct}% in ${range} weeks` : `Risky landings held steady over ${range} weeks`}
                </p>
                {first && last ? (
                  <p className={styles.sub} style={{ marginTop: 4 }}>From {first.riskyLandingsPerSession.toFixed(1)} to {last.riskyLandingsPerSession.toFixed(1)} per session</p>
                ) : null}
              </div>
              <SegmentedControl
                label="Range"
                value={range}
                onChange={setRange}
                options={[
                  { id: "4", label: "4w" },
                  { id: "8", label: "8w" },
                  { id: "12", label: "12w" },
                ]}
              />
            </div>
            <div className="split" style={{ ["--split" as string]: "minmax(0, 1fr) minmax(0, 1fr)" }}>
              <section className="pane">
                <div className="section-head">
                  <h3 className="section-title">Risky landings per session</h3>
                  <small>Weekly average</small>
                </div>
                <LineChartPanel data={slice.map((item) => ({ label: item.week, value: item.riskyLandingsPerSession }))} color={theme.riskMed} endLabel={last ? last.riskyLandingsPerSession.toFixed(1) : ""} />
              </section>
              <section className="pane">
                <div className="section-head">
                  <h3 className="section-title">Takedown success</h3>
                  <small>Completed / attempted</small>
                </div>
                <LineChartPanel data={slice.map((item) => ({ label: item.week, value: item.takedownSuccessPct }))} color={theme.accent} endLabel={last ? `${last.takedownSuccessPct}%` : ""} unit="%" />
              </section>
            </div>
            <div className="split" style={{ ["--split" as string]: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
              <section className="pane">
                <div className="section-head">
                  <h3 className="section-title">Weekly load</h3>
                  <small>0–100 · high above 85</small>
                </div>
                <BarChartPanel data={slice.map((item) => ({ label: item.week, value: item.avgLoad }))} hotAbove={85} height={240} />
              </section>
              <section className="pane">
                <div className="section-head">
                  <h3 className="section-title">Thermal snapshot</h3>
                  <small>After last session</small>
                </div>
                <div className={styles.thermal}>
                  <BodyMap mode="thermal" zones={zones} side="front" />
                  <BodyMap mode="thermal" zones={zones} side="back" />
                </div>
                <p style={{ marginTop: 16, color: "var(--ink-2)" }}>{thermalCaption(athlete, zones)}</p>
              </section>
            </div>
          </div>
        ) : null}
        {tab === "sessions" ? <ReviewsTable lockedAthlete={athlete.id} /> : null}
        {tab === "warmups" ? (
          <dl className={styles.kv}>
            <div>
              <dt>Next plan</dt>
              <dd><StatusTag level={plan.status === "approved" ? "ok" : "neutral"}>{plan.status}</StatusTag></dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd className="num">{plan.steps.reduce((sum, step) => sum + step.minutes, 0)} min</dd>
            </div>
            <div>
              <dt>Adjustments</dt>
              <dd className="num">{plan.steps.filter((step) => step.change !== "standard").length}</dd>
            </div>
            <div>
              <dt>Editor</dt>
              <dd><Link to={`/coach/warmups?athlete=${athlete.id}`}>Open warm-up editor</Link></dd>
            </div>
          </dl>
        ) : null}
        {tab === "sharing" && consent ? (
          <dl className={styles.kv}>
            {([
              ["Heart rate and temperature shared with coach", consent.shareVitals],
              ["Session videos shared with coach", consent.shareVideo],
              ["Anonymised research", consent.research],
              ["Cloud backup", consent.cloudBackup],
            ] as const).map(([label, on]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={on ? styles.yes : styles.no}>{on ? "Yes" : "No"}</dd>
              </div>
            ))}
            <div>
              <dt>Consent date</dt>
              <dd className="num">{consent.consentDate}</dd>
            </div>
            {athlete.age < 18 ? (
              <div>
                <dt>Parent consent</dt>
                <dd>Given 4 Sep 2026</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </AppShell>
  )
}
