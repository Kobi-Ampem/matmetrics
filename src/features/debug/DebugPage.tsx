import { Link } from "react-router-dom"
import { DEMO_SESSION_ID, JACK_ID } from "../../types"
import { flagsFor, mockDb, participationFor } from "../../data"

export function DebugPage() {
  const jack = participationFor(DEMO_SESSION_ID, JACK_ID)
  const flags = flagsFor(DEMO_SESSION_ID, JACK_ID).filter((flag) => !flag.id.startsWith("f-filler"))
  const counts = {
    athletes: mockDb.athletes.length,
    coaches: mockDb.coaches.length,
    sessions: mockDb.sessions.length,
    participations: mockDb.participations.length,
    flags: mockDb.flags.length,
    weekly: mockDb.weekly.length,
    exercises: mockDb.exercises.length,
    warmups: mockDb.warmups.length,
    devices: mockDb.devices.length,
  }
  const plan = mockDb.warmups.find((item) => item.athleteId === JACK_ID)
  const weekly = mockDb.weekly.filter((item) => item.athleteId === JACK_ID)
  return (
    <div className="page">
      <h1 className="page-title">Debug</h1>
      <pre>{JSON.stringify({ counts, jack, flags, planMinutes: plan?.steps.reduce((s, step) => s + step.minutes, 0), plan, weeklyEnds: [weekly[0], weekly.at(-1)] }, null, 2)}</pre>
      <Link to="/">Home</Link>
      <p className="demo-foot">Demo data. Not a medical device.</p>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="page">
      <p>This page is not in the prototype.</p>
      <Link to="/">Back home</Link>
      <p className="demo-foot">Demo data. Not a medical device.</p>
    </div>
  )
}
