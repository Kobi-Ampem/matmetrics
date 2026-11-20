import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { CameraFrame } from "../../components/visuals/CameraFrame"
import { AlertRow } from "../../components/data/AlertRow"
import { MatDiagram } from "../../components/visuals/MatDiagram"
import { StatRow } from "../../components/data/StatRow"
import { Button } from "../../components/controls/Button"
import { mockDb } from "../../data"
import { POSES } from "../../data/poses"
import { storyFlags } from "../../data/liveScript"
import { poseAt, usePoseClock } from "../live/poseClock"
import styles from "../common.module.css"

const ROUTES = [
  ["/coach", "Dashboard", "Today's team, load and alerts"],
  ["/coach/live", "Live session", "Four cameras, alerts and vitals"],
  ["/coach/camera", "Live camera", "Your webcam as stick figures"],
  ["/coach/reviews", "Reviews", "12 weeks of session rows"],
  ["/coach/reviews/s2026-11-17/a01", "Jack's review", "17 Nov session, shoulder landings"],
  ["/coach/athletes", "Athletes", "Roster and 12-week trend"],
  ["/coach/athletes/a01", "Jack's profile", "Risky landings down 51%"],
  ["/coach/warmups", "Warm-ups", "Plan adapted to the last session"],
  ["/coach/system", "System", "Local network and devices"],
  ["/coach/privacy", "Privacy", "Consent, read-only for the coach"],
  ["/athlete", "Athlete app", "Four phone frames"],
]

const STEPS = [
  ["01", "Capture", "Four cameras and wristbands record the session on the club network."],
  ["02", "Detect", "The edge unit flags risky landings, fatigue and mat-edge position."],
  ["03", "Alert", "The coach sees the moment on the tablet in about two seconds."],
  ["04", "Improve", "Each athlete gets a review, a trend, and a warm-up that adapts."],
]

const NODES = [
  ["Edge unit", "Runs pose detection next to the mat. 30 fps per camera."],
  ["Coach tablet", "Live alerts, reviews and warm-up approval."],
  ["Athlete phones", "Own sessions, warm-ups and consent settings."],
]

const STATEMENT = "Four cameras on the mat. The coach sees every fall in about two seconds, and the next warm-up changes.".split(" ")

export function LandingPage() {
  const time = usePoseClock(true)
  const showFlag = Math.floor(time) % 8 < 3
  const flag = storyFlags[2]
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    const previous = document.title
    document.title = "MatMetrics: cameras and a coach app for wrestling clubs"
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className={styles.site}>
      <a className={styles.skip} href="#how">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/" className={styles.word}>
            <span className={styles.mark}>M</span>
            MatMetrics
          </Link>
          <nav>
            <a href="#how">How it works</a>
            <a href="#network">Network</a>
            <a href="#prototype">Prototype</a>
            <Link to="/coach/privacy">Privacy</Link>
            <Button to="/coach" variant="secondary">Open coach app</Button>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className="eyebrow">Smart training for wrestling clubs</div>
            <h1>
              See every fall.
              <br />
              Train every athlete.
            </h1>
            <p>
              AI cameras, sensor wristbands and a coach app that work together on your club's own network, so wrestlers get injured less and improve faster.
            </p>
            <div className={styles.heroCta}>
              <Button to="/coach/live">Open live session</Button>
              <Button to="/athlete" variant="secondary">See athlete app</Button>
            </div>
          </div>
          <div className={styles.heroWindow}>
            <CameraFrame
              camera={mockDb.cameras[0]!}
              pose={showFlag ? POSES.landing : poseAt(time)}
              flag={showFlag && flag ? flag : undefined}
            />
            {showFlag && flag ? (
              <div className={styles.heroAlert}>
                <AlertRow alert={flag} variant="dark" />
              </div>
            ) : null}
          </div>
        </section>

        <section id="how" className={styles.block}>
          <div className={styles.blockHead}>
            <div>
              <div className="eyebrow">How it works</div>
              <h2>From the mat to the next warm-up.</h2>
            </div>
            <p>Every session feeds the next one. Coaches get the moment that matters. Athletes get a plan built from their own data.</p>
          </div>
          <div className={styles.steps4}>
            {STEPS.map(([n, title, copy]) => (
              <article key={n}>
                <span>{n}</span>
                <h3 className="section-title">{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <Statement />

        <section id="network" className={styles.block}>
          <div className={styles.blockHead}>
            <div>
              <div className="eyebrow">Local network, no internet needed</div>
              <h2>Video stays in the club.</h2>
            </div>
            <p>Cameras, wristbands, the tablet and phones talk to one edge unit in the room. Nothing leaves the building unless an athlete opts in.</p>
          </div>
          <div className={styles.diagram}>
            <MatDiagram cameras={mockDb.cameras} onHover={setHover} />
            <div className={styles.nodes}>
              {NODES.map(([node, copy]) => (
                <div key={node} className={hover ? `${styles.node} ${styles.nodeOn}` : styles.node}>
                  <div>
                    <b>{node}</b>
                    <p>{copy}</p>
                  </div>
                  <span className={styles.sub}>{hover ? `Linked to ${hover.toUpperCase()}` : "On the club network"}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 48 }}>
            <StatRow
              items={[
                { label: "Camera angles", value: "4" },
                { label: "Alert time (target)", value: "< 2", unit: "s" },
                { label: "Data leaves the club by default", value: "0" },
                { label: "Athletes tracked", value: "18" },
              ]}
            />
          </div>
        </section>

        <section id="prototype" className={styles.block}>
          <div className={styles.blockHead}>
            <div>
              <div className="eyebrow">Prototype</div>
              <h2>Walk through the demo.</h2>
            </div>
            <p>Seeded data for one club over 12 weeks. Start with the live session, then follow Jack Miller's shoulder landings to his review and warm-up.</p>
          </div>
          <div className={styles.links}>
            {ROUTES.map(([to, title, copy]) => (
              <Link key={to} to={to}>
                <span>
                  <b>{title}</b>
                  <small>{copy}</small>
                </span>
                <ArrowRight size={18} strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>MatMetrics prototype. Demo data only. Not a medical device.</span>
        <span>Team names</span>
      </footer>
    </div>
  )
}

function Statement() {
  const ref = useRef<HTMLElement>(null)
  const [count, setCount] = useState(0)
  const reduced = useRef(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduced.current = media.matches
    if (media.matches) {
      setCount(STATEMENT.length)
      return
    }
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const box = el.getBoundingClientRect()
      const mid = window.innerHeight * 0.55
      const progress = (mid - box.top) / Math.max(box.height, 1)
      setCount(Math.round(Math.min(1, Math.max(0, progress)) * STATEMENT.length))
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section ref={ref} className={styles.statement} aria-label="What the club gets">
      <p>
        {STATEMENT.map((word, index) => {
          const bare = word.replace(/[^a-z]/gi, "").toLowerCase()
          const on = index < count
          const accent = bare === "fall"
          return (
            <span key={`${word}-${index}`} className={on ? (accent ? styles.wordAccent : styles.wordOn) : styles.wordOff}>
              {word}{" "}
            </span>
          )
        })}
      </p>
    </section>
  )
}
