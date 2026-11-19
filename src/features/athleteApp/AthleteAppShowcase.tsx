import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Check, Dumbbell, Film, Home, Shield } from "lucide-react"
import { PhoneFrame } from "../../components/layout/PhoneFrame"
import { Select } from "../../components/controls/Select"
import { Toggle } from "../../components/controls/Toggle"
import { Button } from "../../components/controls/Button"
import { Sparkline } from "../../components/data/Sparkline"
import { CameraFrame } from "../../components/visuals/CameraFrame"
import { POSES } from "../../data/poses"
import { athleteById, flagsFor, mockDb, participationFor, summaryFor } from "../../data"
import { DEMO_SESSION_ID } from "../../types"
import { useSettings } from "../../state/SettingsContext"
import { exercises } from "../../data/exercises"
import { formatDate, formatVideoTime } from "../../utils/format"
import { isRiskyLanding } from "../../utils/risk"
import styles from "../common.module.css"

type Tab = "home" | "sessions" | "warmup" | "profile"

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "sessions", label: "Sessions", icon: Film },
  { id: "warmup", label: "Warm-up", icon: Dumbbell },
  { id: "profile", label: "Privacy", icon: Shield },
]

const LEVEL_COLOR = {
  high: "var(--risk-high)",
  med: "var(--risk-med)",
  low: "var(--risk-low)",
  positive: "var(--ok)",
} as const

function PhoneApp({ athleteId, initial }: { athleteId: string; initial: Tab }) {
  const [tab, setTab] = useState<Tab>(initial)
  const athlete = athleteById(athleteId)
  const settings = useSettings()
  if (!athlete) return null
  const weekly = mockDb.weekly.filter((item) => item.athleteId === athleteId).sort((a, b) => a.weekIndex - b.weekIndex)
  const first = weekly[0]
  const last = weekly[weekly.length - 1]
  const part = participationFor(DEMO_SESSION_ID, athleteId)
  const flags = flagsFor(DEMO_SESSION_ID, athleteId)
  const summary = summaryFor(DEMO_SESSION_ID, athleteId)
  const plan = settings.planFor(athleteId)
  const consent = settings.consentFor(athleteId)
  const session = mockDb.sessions.find((item) => item.id === DEMO_SESSION_ID)
  const firstName = athlete.name.split(" ")[0]

  return (
    <div className={styles.phoneScreen}>
      <div className={styles.phoneStatus} aria-hidden="true">
        <span>19:52</span>
        <span>MatMetrics</span>
      </div>
      <div className={styles.phoneBody}>
        {tab === "home" ? (
          <div className="stack">
            <div>
              <p className={styles.phoneGreet}>Good evening</p>
              <h2 className={styles.phoneTitle}>{firstName}</h2>
            </div>
            <div className={styles.phoneStat}>
              <div className={styles.bigStat}>{last?.riskyLandingsPerSession.toFixed(1)}</div>
              <p style={{ marginTop: 8 }}>risky landings per session</p>
              {first && last ? (
                <p className={styles.sub} style={{ marginTop: 2 }}>
                  {last.riskyLandingsPerSession < first.riskyLandingsPerSession
                    ? "down from"
                    : last.riskyLandingsPerSession > first.riskyLandingsPerSession
                      ? "up from"
                      : "level with"}{" "}
                  {first.riskyLandingsPerSession.toFixed(1)} in 12 weeks
                </p>
              ) : null}
              <div style={{ marginTop: 16 }}>
                <Sparkline values={weekly.map((item) => item.riskyLandingsPerSession)} tone="ok" />
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Last session, {session ? formatDate(session.date) : ""}</div>
              {part ? (
                <div className={styles.phoneRows}>
                  <div><span>Time on mat</span><span className="num">{part.minutesOnMat} min</span></div>
                  <div><span>Takedowns</span><span className="num">{part.takedownsCompleted}/{part.takedownAttempts}</span></div>
                  <div><span>Risky landings</span><span className="num">{flags.filter(isRiskyLanding).length}</span></div>
                </div>
              ) : (
                <p className="muted">No session today.</p>
              )}
            </div>
            <div className={styles.phoneFull}>
              <Button variant="secondary" onClick={() => setTab("sessions")}>Open review</Button>
            </div>
          </div>
        ) : null}
        {tab === "sessions" ? (
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <p className={styles.phoneGreet}>{session ? formatDate(session.date) : ""} · {session?.type}</p>
              <h2 className={styles.phoneTitle}>Your review</h2>
            </div>
            <CameraFrame camera={{ ...mockDb.cameras[0]!, status: "online" }} pose={POSES.landing} />
            <div className={styles.chips}>
              {flags.map((flag) => (
                <span key={flag.id} className={flag.level === "positive" ? styles.chipOk : undefined}>
                  {formatVideoTime(flag.minute * 60)}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55 }}>{summary.text}</p>
            <div>
              {flags.map((flag) => (
                <div key={flag.id} className={styles.phoneMoment}>
                  <span className="num">{flag.clock.slice(0, 5)}</span>
                  <span>
                    <i style={{ background: LEVEL_COLOR[flag.level] }} />
                    {flag.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {tab === "warmup" ? <WarmupPhone athleteId={athleteId} approved={plan.status === "approved"} /> : null}
        {tab === "profile" && consent ? (
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <p className={styles.phoneGreet}>Privacy</p>
              <h2 className={styles.phoneTitle}>What you share</h2>
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Toggle label="Share heart rate and temperature" checked={consent.shareVitals} onChange={(value) => settings.updateConsent(athleteId, { shareVitals: value })} />
              <Toggle label="Share session videos" checked={consent.shareVideo} onChange={(value) => settings.updateConsent(athleteId, { shareVideo: value })} />
              <Toggle label="Anonymised research" checked={consent.research} onChange={(value) => settings.updateConsent(athleteId, { research: value })} />
              <Toggle label="Cloud backup when online" checked={consent.cloudBackup} onChange={(value) => settings.updateConsent(athleteId, { cloudBackup: value })} />
            </div>
            <p className={styles.sub}>Changes show on the coach's privacy page.</p>
          </div>
        ) : null}
      </div>
      <nav className={styles.phoneTabs} aria-label="Athlete app">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} type="button" className={tab === item.id ? styles.on : undefined} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>
              <Icon size={20} strokeWidth={1.5} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function WarmupPhone({ athleteId, approved }: { athleteId: string; approved: boolean }) {
  const plan = useSettings().planFor(athleteId)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [left, setLeft] = useState((plan.steps[0]?.minutes ?? 1) * 60)
  useEffect(() => {
    if (!started) return
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value > 1) return value - 1
        setIndex((current) => {
          const next = current + 1
          const step = plan.steps[next]
          if (!step) {
            setStarted(false)
            return current
          }
          setLeft(step.minutes * 60)
          return next
        })
        return value
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [started, plan.steps])

  if (started) {
    const step = plan.steps[index]
    const next = plan.steps[index + 1]
    return (
      <div className="stack">
        <div>
          <p className={styles.phoneGreet}>Step {index + 1} of {plan.steps.length}</p>
          <h2 className={styles.phoneTitle}>{exercises.find((item) => item.id === step?.exerciseId)?.name}</h2>
        </div>
        <div className={styles.timerRing}>{formatVideoTime(left)}</div>
        <div className={styles.progress} style={{ maxWidth: "none", marginTop: 0 }}>
          <span style={{ width: `${((index + 1) / plan.steps.length) * 100}%` }} />
        </div>
        {next ? <p className={styles.sub}>Next: {exercises.find((item) => item.id === next.exerciseId)?.name}</p> : null}
        <div className={styles.phoneFull}>
          <Button variant="secondary" onClick={() => setStarted(false)}>Stop</Button>
        </div>
      </div>
    )
  }

  const total = plan.steps.reduce((sum, step) => sum + step.minutes, 0)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <p className={styles.phoneGreet}>Thursday</p>
        <h2 className={styles.phoneTitle}>Warm-up, {total} min</h2>
        <div style={{ marginTop: 8 }}>
          {approved ? (
            <span className={styles.approved}><Check size={16} strokeWidth={2} /> Approved by Coach David</span>
          ) : (
            <span className={styles.pending}>Suggested. Waiting for coach approval.</span>
          )}
        </div>
      </div>
      <div className={styles.phoneSteps} style={{ borderTop: "1px solid var(--line)" }}>
        {plan.steps.map((step, stepIndex) => (
          <div key={`${step.exerciseId}-${stepIndex}`}>
            <span className="num">{step.minutes} min</span>
            <span>{exercises.find((item) => item.id === step.exerciseId)?.name}</span>
          </div>
        ))}
      </div>
      <div className={styles.phoneFull}>
        <Button onClick={() => { setIndex(0); setLeft((plan.steps[0]?.minutes ?? 1) * 60); setStarted(true) }}>Start warm-up</Button>
      </div>
    </div>
  )
}

export function AthleteAppShowcase() {
  const [athleteId, setAthleteId] = useState("a01")
  return (
    <div className={styles.showcase}>
      <header className={styles.header}>
        <Link to="/" className={styles.word}>
          <span className={styles.mark}>M</span>
          MatMetrics
        </Link>
        <nav>
          <Button to="/coach" variant="secondary">Open coach app</Button>
        </nav>
      </header>
      <div className={styles.showHead}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Athlete app</div>
          <h1>One phone, four screens.</h1>
          <p>Each wrestler reviews their own session, follows the warm-up the coach approved, and chooses what is shared.</p>
        </div>
        <Select label="Athlete" value={athleteId} onChange={setAthleteId} options={mockDb.athletes.map((athlete) => ({ value: athlete.id, label: athlete.name }))} />
      </div>
      <div className={styles.phones}>
        <PhoneFrame label="Home"><PhoneApp key={`${athleteId}-home`} athleteId={athleteId} initial="home" /></PhoneFrame>
        <PhoneFrame label="Session"><PhoneApp key={`${athleteId}-sessions`} athleteId={athleteId} initial="sessions" /></PhoneFrame>
        <PhoneFrame label="Warm-up"><PhoneApp key={`${athleteId}-warmup`} athleteId={athleteId} initial="warmup" /></PhoneFrame>
        <PhoneFrame label="Privacy"><PhoneApp key={`${athleteId}-profile`} athleteId={athleteId} initial="profile" /></PhoneFrame>
      </div>
      <p className="demo-foot">Demo data. Not a medical device.</p>
    </div>
  )
}
