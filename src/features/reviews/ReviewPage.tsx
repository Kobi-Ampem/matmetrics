import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Check, Pause, Play } from "lucide-react"
import clsx from "clsx"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Button } from "../../components/controls/Button"
import { SegmentedControl } from "../../components/controls/SegmentedControl"
import { CameraFrame } from "../../components/visuals/CameraFrame"
import { BodyMap } from "../../components/visuals/BodyMap"
import { StatRow } from "../../components/data/StatRow"
import { StatusTag } from "../../components/data/StatusTag"
import { HeartChart } from "../../components/charts/Charts"
import { POSES } from "../../data/poses"
import { flagsFor, landingCaption, mockDb, participationFor, sessionById, summaryFor, vitalsForReview, athleteById } from "../../data"
import { useSettings } from "../../state/SettingsContext"
import { formatDate, formatVideoTime } from "../../utils/format"
import { BODY_ZONES, type BodyZone, type Camera } from "../../types"
import { isRiskyLanding } from "../../utils/risk"
import { poseForKind } from "../live/poseClock"
import styles from "../common.module.css"

type View = Camera["id"] | "multi"

export function ReviewPage() {
  const { sessionId = "", athleteId = "" } = useParams()
  const session = sessionById(sessionId)
  const athlete = athleteById(athleteId)
  const participation = participationFor(sessionId, athleteId)
  const flags = flagsFor(sessionId, athleteId)
  const summary = summaryFor(sessionId, athleteId)
  const { isShared, setShared, noteFor, saveNote } = useSettings()
  const shareKey = `${sessionId}:${athleteId}`
  const note = noteFor(shareKey)
  const [text, setText] = useState(note?.text ?? "")
  const [saved, setSaved] = useState(note?.savedAt ?? "")
  const first = flags.find((flag) => flag.level !== "positive")
  const [playhead, setPlayhead] = useState(first ? Math.round(first.minute * 60) : 0)
  const [playing, setPlaying] = useState(false)
  const [camera, setCamera] = useState<View>("cam1")

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPlayhead((value) => (value >= 5400 ? 0 : value + 1))
    }, 200)
    return () => window.clearInterval(id)
  }, [playing])

  if (!session || !athlete || !participation) {
    return (
      <AppShell>
        <div className="page stack">
          <p>Review not found.</p>
          <Link to="/coach/reviews">Back to reviews</Link>
        </div>
      </AppShell>
    )
  }

  const active = [...flags].reverse().find((flag) => flag.minute * 60 <= playhead)
  const pose = active ? POSES[poseForKind(active.kind)] : POSES.stance
  const samples = vitalsForReview(sessionId, athleteId).filter((_, index) => index % 3 === 0)
  const zones = emptyZones()
  for (const flag of flags) {
    if (flag.zone && isRiskyLanding(flag)) zones[flag.zone] += 1
  }
  const shared = isShared(shareKey)

  return (
    <AppShell>
      <TopBar
        title={`${athlete.name}, session review`}
        breadcrumb={
          <>
            <Link to="/coach/reviews">Reviews</Link>
            <span>/</span>
            <span>{formatDate(session.date)} · {session.type}</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              Export PDF
            </Button>
            <Button icon={shared ? <Check size={16} strokeWidth={2} /> : undefined} onClick={() => setShared(shareKey, !shared)}>
              {shared ? "Shared with athlete" : "Share with athlete"}
            </Button>
          </>
        }
      />
      <div className="page stack-lg">
        <div className="split" style={{ ["--split" as string]: "minmax(0, 1.6fr) minmax(300px, 0.9fr)" }}>
          <section className={`pane ${styles.player}`}>
            <div className={styles.camTabs}>
              <SegmentedControl
                label="Camera"
                value={camera}
                onChange={setCamera}
                options={[
                  { id: "cam1", label: "CAM 1" },
                  { id: "cam2", label: "CAM 2" },
                  { id: "cam3", label: "CAM 3" },
                  { id: "cam4", label: "CAM 4" },
                  { id: "multi", label: "All" },
                ]}
              />
              <span className={styles.sub}>{active ? `${active.clock} · ${active.description}` : "Before the first flag"}</span>
            </div>
            {camera === "multi" ? (
              <div className={styles.strip} style={{ gridTemplateColumns: "1fr 1fr" }}>
                {mockDb.cameras.map((item) => (
                  <CameraFrame key={item.id} camera={{ ...item, status: "online" }} pose={pose} flag={active && active.cameras.includes(item.id) ? active : undefined} />
                ))}
              </div>
            ) : (
              <CameraFrame
                camera={{ ...(mockDb.cameras.find((item) => item.id === camera) ?? mockDb.cameras[0]!), status: "online" }}
                pose={pose}
                flag={active && active.cameras.includes(camera) ? active : undefined}
              />
            )}
            <div className={styles.transport}>
              <button type="button" className={styles.iconBtn} onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause size={16} strokeWidth={1.75} /> : <Play size={16} strokeWidth={1.75} />}
              </button>
              <span className="num">{formatVideoTime(playhead)} / 90:00</span>
            </div>
            <div className={styles.timeline}>
              <input
                aria-label="Session timeline"
                type="range"
                min={0}
                max={5400}
                value={playhead}
                onChange={(event) => setPlayhead(Number(event.target.value))}
              />
              {flags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  className={`${styles.marker} ${flag.level === "high" ? styles.highM : flag.level === "med" ? styles.medM : flag.level === "positive" ? styles.posM : styles.lowM}`}
                  style={{ left: `${(flag.minute / 90) * 100}%` }}
                  aria-label={`${flag.clock} ${flag.description}`}
                  title={`${formatVideoTime(flag.minute * 60)} · ${flag.description}`}
                  onClick={() => setPlayhead(Math.round(flag.minute * 60))}
                />
              ))}
            </div>
          </section>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Flagged moments</h2>
              <small>{flags.length} in 90 min</small>
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {flags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  className={clsx(styles.moment, active?.id === flag.id && styles.current)}
                  onClick={() => setPlayhead(Math.round(flag.minute * 60))}
                >
                  <span className="num">{formatVideoTime(flag.minute * 60)}</span>
                  <span>
                    <b>{flag.description}</b>
                    <small>{flag.cameras.length ? flag.cameras.map((id) => id.replace("cam", "CAM ")).join(" + ") : flag.source.toUpperCase()}</small>
                  </span>
                  <StatusTag level={flag.level} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <StatRow
          items={[
            { label: "Time on mat", value: String(participation.minutesOnMat), unit: "min" },
            { label: "Avg HR", value: String(participation.avgHr), unit: "bpm" },
            { label: "Peak HR", value: String(participation.peakHr), unit: "bpm" },
            { label: "Takedowns", value: `${participation.takedownsCompleted}/${participation.takedownAttempts}` },
            { label: "Risky landings", value: String(flags.filter(isRiskyLanding).length) },
          ]}
        />

        <div className="split" style={{ ["--split" as string]: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
          <section className="pane stack">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>AI summary</div>
              <p className={styles.lead}>{summary.text}</p>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Focus for next session</div>
              <ol className={styles.focus}>
                {summary.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </section>
          <section className="pane">
            <div className="section-head">
              <h2 className="section-title">Landing map</h2>
            </div>
            <div className={styles.mapRow}>
              <BodyMap mode="landing" zones={zones} side="front" />
              <p>{landingCaption(flags)}</p>
            </div>
          </section>
        </div>

        <section>
          <div className="section-head">
            <h2 className="section-title">Heart rate</h2>
            <small>Red lines mark flags · shaded above 170 bpm</small>
          </div>
          <HeartChart data={samples.map((sample) => ({ t: sample.t, hr: sample.hr }))} flagSeconds={flags.map((flag) => Math.round(flag.minute * 60))} />
        </section>

        <section className={`${styles.narrow} stack`} style={{ gap: 12 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2 className="section-title">Coach note</h2>
            <small>Visible to the athlete when shared</small>
          </div>
          <textarea className={styles.note} value={text} onChange={(event) => setText(event.target.value)} aria-label="Coach note" placeholder="Add a note for the athlete" />
          <div className={styles.filters} style={{ alignItems: "center" }}>
            <Button
              onClick={() => {
                saveNote(shareKey, text)
                const now = new Date()
                setSaved(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
              }}
            >
              Save note
            </Button>
            {saved ? <span className={styles.toast}><Check size={14} strokeWidth={2} />Saved {saved}</span> : null}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function emptyZones(): Record<BodyZone, number> {
  return Object.fromEntries(BODY_ZONES.map((zone) => [zone, 0])) as Record<BodyZone, number>
}
