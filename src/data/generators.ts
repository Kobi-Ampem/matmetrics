import type {
  Athlete,
  BodyZone,
  ConsentSettings,
  Device,
  Flag,
  FlagKind,
  Participation,
  Session,
  VitalsSample,
  WarmupPlan,
  WarmupStep,
  WeeklyProgress,
} from "../types"
import { BODY_ZONES, DEMO_SESSION_ID, DEMO_TODAY, JACK_ID } from "../types"
import { athletes } from "./athletes"
import { BLOCKS, coaches, rooms } from "./club"
import { describeFlag } from "./alertTemplates"
import { STANDARD_STEPS } from "./exercises"
import { nov17Flags } from "./liveScript"
import { between, gauss, hashString, mulberry32, pick, poisson, rng } from "./rng"
import { addDays, clamp, round1, sessionClock } from "../utils/format"
import { isRiskyLanding } from "../utils/risk"

const ALL_ZONES = BODY_ZONES

function roomForTemp(temp: number): string {
  if (temp <= 20) return "cool"
  if (temp <= 23) return "standard"
  return "warm"
}

function weekLabel(index: number): string {
  return `W${35 + index}`
}

export function buildSessions(): Session[] {
  const sessions: Session[] = []
  let satCount = 0
  for (let week = 0; week < 12; week += 1) {
    const monday = addDays("2026-08-31", week * 7)
    const days: { offset: number; kind: "tue" | "thu" | "sat" }[] = [
      { offset: 1, kind: "tue" },
      { offset: 3, kind: "thu" },
      { offset: 5, kind: "sat" },
    ]
    for (const day of days) {
      const date = addDays(monday, day.offset)
      if (date > DEMO_TODAY) continue
      const month = Number(date.slice(5, 7))
      const temp =
        month <= 9 ? between(22, 24) : month === 10 ? between(20, 22) : between(17, 20)
      let type: Session["type"] = "Live sparring"
      let start = "18:30"
      let end = "20:00"
      if (day.kind === "thu") type = "Technique"
      if (day.kind === "sat") {
        satCount += 1
        type = satCount % 4 === 0 ? "Conditioning" : "Competition prep"
        start = "10:00"
        end = "11:30"
      }
      const roomTempC = Math.round(temp * 10) / 10
      sessions.push({
        id: `s${date}`,
        date,
        start,
        end,
        type,
        coachId: coaches[week % coaches.length]?.id ?? "c1",
        roomTempC,
        humidity: Math.round(between(42, 62)),
        roomProfileId: roomForTemp(roomTempC),
        blocks: BLOCKS,
        week: weekLabel(week),
        weekIndex: week,
      })
    }
  }
  return sessions
}

function attendChance(level: Athlete["level"]): number {
  if (level === "Competitive") return 0.92
  if (level === "Beginner") return 0.75
  return 0.85
}

function baseSuccess(level: Athlete["level"]): number {
  if (level === "Beginner") return 0.35
  if (level === "Intermediate") return 0.45
  return 0.5
}

export function buildParticipations(sessions: Session[]): Participation[] {
  const rows: Participation[] = []
  for (const session of sessions) {
    for (const athlete of athletes) {
      const force = session.id === DEMO_SESSION_ID || athlete.id === JACK_ID
      if (!force && rng() > attendChance(athlete.level)) continue
      const minutesOnMat = Math.round(between(35, 55))
      const avgHr = Math.round(
        athlete.restingHr + 0.62 * (athlete.maxHr - athlete.restingHr) + gauss(0, 5),
      )
      const peakHr = Math.round(0.94 * athlete.maxHr + gauss(0, 4))
      const attempts = Math.round(between(6, 16))
      const rate = clamp(
        baseSuccess(athlete.level) + session.weekIndex * between(0.01, 0.02) + gauss(0, 0.03),
        0.2,
        0.8,
      )
      const completed = Math.round(attempts * rate)
      const shotsFaced = Math.round(between(4, 12))
      const shotsDefended = Math.round(shotsFaced * between(0.4, 0.85))
      const typeWeight =
        session.type === "Live sparring" ? 1 : session.type === "Competition prep" ? 0.92 : 0.78
      const load = Math.round(
        clamp((minutesOnMat / 55) * 38 + (avgHr / athlete.maxHr) * 55 * typeWeight, 28, 96),
      )
      rows.push({
        sessionId: session.id,
        athleteId: athlete.id,
        minutesOnMat,
        avgHr: clamp(avgHr, athlete.restingHr + 20, athlete.maxHr - 4),
        peakHr: clamp(peakHr, avgHr + 8, athlete.maxHr),
        minutesAbove170: Math.round(between(4, 18)),
        takedownAttempts: attempts,
        takedownsCompleted: Math.min(attempts, completed),
        shotsDefended: Math.min(shotsFaced, shotsDefended),
        shotsFaced,
        load,
        skinTempPeak: round1(athlete.baselineSkinTemp + between(0.6, 1.4)),
      })
    }
  }
  return rows
}

function sideOf(zone: BodyZone | undefined): "left" | "right" {
  if (!zone) return "right"
  return zone.endsWith("_l") ? "left" : "right"
}

function camerasFor(zone: BodyZone | undefined): Flag["cameras"] {
  const map: Record<string, Flag["cameras"]> = {
    head_neck: ["cam2", "cam3"],
    shoulder_l: ["cam2"],
    shoulder_r: ["cam1", "cam4"],
    upper_back: ["cam3"],
    lower_back: ["cam3", "cam1"],
    hip_l: ["cam2"],
    hip_r: ["cam4"],
    knee_l: ["cam1"],
    knee_r: ["cam2"],
    ankle_l: ["cam1"],
    ankle_r: ["cam4"],
  }
  const preferred = zone ? map[zone] : undefined
  if (!preferred) return [pick(["cam1", "cam2", "cam3", "cam4"] as const)]
  if (preferred.length > 1 && rng() < 0.45) return [preferred[0]]
  return preferred
}

function kindForZone(zone: BodyZone): FlagKind {
  if (zone === "head_neck") return rng() < 0.75 ? "neck_landing" : "back_slam"
  if (zone.startsWith("shoulder")) return "shoulder_landing"
  if (zone.startsWith("knee") || zone.startsWith("ankle")) return "knee_twist"
  if (zone.endsWith("back")) return "back_slam"
  if (zone.startsWith("hip")) return rng() < 0.45 ? "hips_high_shot" : "back_slam"
  return "mat_edge"
}

function levelFor(kind: FlagKind): Flag["level"] {
  if (kind === "good_finish") return "positive"
  if (kind === "neck_landing" || kind === "knee_twist") return rng() < 0.72 ? "high" : "med"
  if (kind === "shoulder_landing" || kind === "back_slam") return rng() < 0.7 ? "med" : "low"
  if (kind === "hips_high_shot" || kind === "fatigue_slowdown" || kind === "high_hr_sustained")
    return "med"
  return "low"
}

export function buildFlags(sessions: Session[], participations: Participation[]): Flag[] {
  const flags: Flag[] = []
  let n = 0
  for (const session of sessions) {
    if (session.id === DEMO_SESSION_ID) continue
    const present = participations.filter((row) => row.sessionId === session.id)
    for (const row of present) {
      const athlete = athletes.find((item) => item.id === row.athleteId)
      if (!athlete) continue
      const lambda = Math.max(
        0,
        athlete.riskProfile.baseFlagRate + athlete.riskProfile.improvementPerWeek * session.weekIndex,
      )
      const count = poisson(lambda)
      for (let i = 0; i < count; i += 1) {
        const zone = rng() < 0.6 ? athlete.riskProfile.preferredZone : pick(ALL_ZONES)
        const kind = kindForZone(zone)
        const minute = rng() < 0.78 ? between(41, 78) : between(16, 39)
        n += 1
        flags.push({
          id: `f-${session.id}-${athlete.id}-${n}`,
          sessionId: session.id,
          athleteId: athlete.id,
          kind,
          level: levelFor(kind),
          minute,
          clock: sessionClock(session.start, minute),
          zone,
          cameras: camerasFor(zone),
          source: "camera",
          description: describeFlag(kind, sideOf(zone), rng),
          seen: false,
        })
      }
      const positives = Math.floor(rng() * 3)
      for (let i = 0; i < positives; i += 1) {
        const minute = between(42, 78)
        n += 1
        flags.push({
          id: `f-${session.id}-${athlete.id}-g${n}`,
          sessionId: session.id,
          athleteId: athlete.id,
          kind: "good_finish",
          level: "positive",
          minute,
          clock: sessionClock(session.start, minute),
          cameras: [pick(["cam1", "cam2", "cam3", "cam4"] as const)],
          source: "camera",
          description: describeFlag("good_finish", "right", rng),
          seen: false,
        })
      }
    }
  }
  flags.push(...nov17Flags)
  return flags
}

export function applyDemoParticipation(rows: Participation[], sessions: Session[]): Participation[] {
  const session = sessions.find((item) => item.id === DEMO_SESSION_ID)
  if (session) {
    session.type = "Live sparring"
    session.start = "18:30"
    session.end = "20:00"
    session.roomTempC = 19.5
    session.humidity = 48
    session.roomProfileId = "cool"
    session.coachId = "c1"
  }
  return rows.map((row) => {
    if (row.sessionId !== DEMO_SESSION_ID || row.athleteId !== JACK_ID) {
      if (row.athleteId === JACK_ID && row.sessionId >= "s2026-11-10") {
        return { ...row, load: 82 }
      }
      return row
    }
    return {
      ...row,
      minutesOnMat: 46,
      avgHr: 161,
      peakHr: 184,
      minutesAbove170: 14,
      takedownAttempts: 14,
      takedownsCompleted: 9,
      shotsDefended: 6,
      shotsFaced: 8,
      load: 82,
      skinTempPeak: round1((athletes.find((a) => a.id === JACK_ID)?.baselineSkinTemp ?? 34) + 1.1),
    }
  })
}

export function buildWeekly(
  sessions: Session[],
  participations: Participation[],
  flags: Flag[],
): WeeklyProgress[] {
  const rows: WeeklyProgress[] = []
  for (const athlete of athletes) {
    for (let week = 0; week < 12; week += 1) {
      const own = sessions.filter((session) => session.weekIndex === week)
      const weekSessions = own.length < 2 && week > 0 ? sessions.filter((session) => session.weekIndex === week || session.weekIndex === week - 1) : own
      const ids = new Set(weekSessions.map((session) => session.id))
      const parts = participations.filter((row) => row.athleteId === athlete.id && ids.has(row.sessionId))
      if (parts.length === 0) continue
      const landingFlags = flags.filter(
        (flag) => flag.athleteId === athlete.id && ids.has(flag.sessionId) && isRiskyLanding(flag),
      )
      const attempts = parts.reduce((sum, row) => sum + row.takedownAttempts, 0)
      const made = parts.reduce((sum, row) => sum + row.takedownsCompleted, 0)
      rows.push({
        athleteId: athlete.id,
        week: weekLabel(week),
        weekIndex: week,
        riskyLandingsPerSession: round1(landingFlags.length / parts.length),
        takedownSuccessPct: attempts === 0 ? 0 : Math.round((made / attempts) * 100),
        avgLoad: Math.round(parts.reduce((sum, row) => sum + row.load, 0) / parts.length),
        sessions: parts.length,
      })
    }
  }
  return rows.map((row) => {
    if (row.athleteId !== JACK_ID) return row
    const risky = round1(4.5 + ((2.2 - 4.5) * row.weekIndex) / 11)
    const takedown = Math.round(50 + ((64 - 50) * row.weekIndex) / 11)
    return {
      ...row,
      riskyLandingsPerSession: risky,
      takedownSuccessPct: row.weekIndex === 11 ? 64 : takedown,
    }
  })
}

function sevenDayLoad(athleteId: string, participations: Participation[], sessions: Session[]): number {
  const recent = new Set(
    sessions.filter((session) => session.date >= "2026-11-10" && session.date <= DEMO_TODAY).map((s) => s.id),
  )
  const parts = participations.filter((row) => row.athleteId === athleteId && recent.has(row.sessionId))
  if (parts.length === 0) return 0
  return Math.round(parts.reduce((sum, row) => sum + row.load, 0) / parts.length)
}

function countKind(flags: Flag[], kind: FlagKind): number {
  return flags.filter((flag) => flag.kind === kind).length
}

export function buildWarmups(
  sessions: Session[],
  participations: Participation[],
  flags: Flag[],
): WarmupPlan[] {
  const last = sessions.filter((session) => session.date <= DEMO_TODAY).at(-1)
  const previous = sessions.filter((session) => session.date < (last?.date ?? DEMO_TODAY)).at(-1)
  return athletes.map((athlete) => {
    if (athlete.id === JACK_ID) return jackPlan()
    const steps: WarmupStep[] = STANDARD_STEPS.map((step) => ({ ...step }))
    const notes: string[] = []
    const recentIds = new Set([last?.id, previous?.id].filter(Boolean) as string[])
    const lastFlags = flags.filter((flag) => flag.athleteId === athlete.id && flag.sessionId === last?.id)
    const recentFlags = flags.filter((flag) => flag.athleteId === athlete.id && recentIds.has(flag.sessionId))
    const shoulder = lastFlags.filter((flag) => flag.kind === "shoulder_landing")
    if (shoulder.length >= 2) {
      const side = shoulder.some((flag) => flag.zone === "shoulder_l") ? "left" : "right"
      const reason = `Added: ${shoulder.length} ${side}-shoulder landings last session`
      steps.push({ exerciseId: "ext-rot", minutes: 2, reason, change: "added" })
      steps.push({
        exerciseId: side === "left" ? "rolls-back" : "rolls-fwd",
        minutes: 3,
        reason,
        change: "added",
      })
      notes.push(reason)
    }
    if (recentFlags.some((flag) => flag.kind === "neck_landing")) {
      steps.push({
        exerciseId: "neck-iso",
        minutes: 2,
        reason: "Added: head and neck flag in the last two sessions",
        change: "added",
      })
      steps.push({
        exerciseId: "breakfalls",
        minutes: 2,
        reason: "Added: head and neck flag in the last two sessions",
        change: "added",
      })
      notes.push("Added: head and neck flag in the last two sessions")
    }
    if (recentFlags.some((flag) => flag.kind === "knee_twist")) {
      steps.push({
        exerciseId: "knee-circles",
        minutes: 2,
        reason: "Added: knee twist flag in the last two sessions",
        change: "added",
      })
      steps.push({
        exerciseId: "balance",
        minutes: 2,
        reason: "Added: knee twist flag in the last two sessions",
        change: "added",
      })
      notes.push("Added: knee twist flag in the last two sessions")
    }
    const lastSession = sessions.find((session) => session.id === last?.id)
    const room = rooms.find((item) => item.id === lastSession?.roomProfileId)
    if (room?.id === "cool") {
      const jog = steps.find((step) => step.exerciseId === "jog")
      if (jog) {
        jog.minutes += 1
        jog.change = "adjusted"
        jog.reason = "Room profile Cool hall: warm-up extended"
      }
      steps.splice(2, 0, {
        exerciseId: "leg-swings",
        minutes: 2,
        reason: "Room profile Cool hall: warm-up extended",
        change: "added",
      })
      notes.push("Room profile Cool hall: warm-up extended")
    }
    const load = sevenDayLoad(athlete.id, participations, sessions)
    if (load > 80) {
      const hands = steps.find((step) => step.exerciseId === "hand-fighting")
      if (hands && hands.minutes > 1) {
        hands.minutes -= 1
        hands.change = "adjusted"
        hands.reason = `Load last 7 days is high (${load}/100): partner drills kept at 50%`
      }
      notes.push(`Load last 7 days is high (${load}/100): partner drills kept at 50%`)
    }
    const hips = recentFlags.filter((flag) => flag.kind === "hips_high_shot").length
    if (hips >= 3) {
      const stance = steps.find((step) => step.exerciseId === "stance")
      if (stance) {
        stance.exerciseId = "level-change"
        stance.change = "adjusted"
        stance.reason = "Adjusted: hips rose on shots across the last two weeks"
      }
      notes.push("Adjusted: hips rose on shots across the last two weeks")
    }
    let total = steps.reduce((sum, step) => sum + step.minutes, 0)
    while (total > 22 && steps.length > 0) {
      const standard = [...steps].reverse().find((step) => step.change === "standard" && step.minutes > 1)
      if (!standard) break
      standard.minutes -= 1
      total -= 1
    }
    const changed = steps.some((step) => step.change !== "standard")
    return {
      athleteId: athlete.id,
      date: "2026-11-19",
      steps,
      notes,
      status: changed ? "suggested" : "standard",
    }
  })
}

function jackPlan(): WarmupPlan {
  return {
    athleteId: JACK_ID,
    date: "2026-11-19",
    status: "suggested",
    notes: [
      "Added: 3 right-shoulder landings last session",
      "Room profile Cool hall: warm-up extended",
      "Load last 7 days is high (82/100): partner drills kept at 50%",
    ],
    steps: [
      {
        exerciseId: "jog",
        minutes: 4,
        reason: "Room profile Cool hall: warm-up extended",
        change: "adjusted",
      },
      {
        exerciseId: "hip-openers",
        minutes: 3,
        reason: "Room profile Cool hall: warm-up extended",
        change: "adjusted",
      },
      {
        exerciseId: "leg-swings",
        minutes: 2,
        reason: "Room profile Cool hall: warm-up extended",
        change: "added",
      },
      { exerciseId: "neck-bridges", minutes: 2, reason: "Standard plan", change: "standard" },
      {
        exerciseId: "ext-rot",
        minutes: 2,
        reason: "Added: 3 right-shoulder landings last session",
        change: "added",
      },
      {
        exerciseId: "rolls-fwd",
        minutes: 3,
        reason: "Added: 3 right-shoulder landings last session",
        change: "added",
      },
      {
        exerciseId: "hand-fighting",
        minutes: 2,
        reason: "Load last 7 days is high (82/100): partner drills kept at 50%",
        change: "adjusted",
      },
    ],
  }
}

export function buildDevices(): Device[] {
  const random = mulberry32(20261119)
  const bands: Device[] = athletes.map((athlete) => {
    const legacy = athlete.id === "a06" || athlete.id === "a11"
    const battery = athlete.id === "a07" ? 47 : Math.round(between(40, 95, random))
    return {
      id: athlete.bandId,
      kind: "band",
      label: athlete.bandId,
      status: "online",
      battery,
      firmware: legacy ? "1.2.4" : "1.3.0",
      lastSeen: "19:27",
      detail: athlete.name,
      athleteId: athlete.id,
      updateAvailable: legacy,
    }
  })
  return [
    {
      id: "edge-01",
      kind: "edge",
      label: "MatMetrics Edge 01",
      status: "online",
      firmware: "v0.4.2",
      lastSeen: "19:27",
      detail: "model v0.4.2",
    },
    {
      id: "router-01",
      kind: "router",
      label: "Club router",
      status: "online",
      lastSeen: "19:27",
      detail: "5 GHz, 23 devices",
    },
    {
      id: "thermal-01",
      kind: "thermal",
      label: "Thermal camera",
      status: "online",
      lastSeen: "19:26",
      detail: "Snapshot mode",
    },
    ...bands,
  ]
}

export function buildConsents(): ConsentSettings[] {
  return athletes.map((athlete, index) => ({
    athleteId: athlete.id,
    shareVitals: true,
    shareVideo: index % 5 !== 0,
    research: index % 4 === 0,
    cloudBackup: false,
    consentDate: athlete.age < 18 ? "2026-09-04" : athlete.memberSince,
    parentConsent: athlete.age < 18 ? "2026-09-04" : undefined,
  }))
}

export function buildFps(): number[] {
  const random = mulberry32(20261120)
  return Array.from({ length: 60 }, () => Math.round((29.2 + (random() - 0.5) * 1.6) * 10) / 10)
}

const vitalsCache = new Map<string, VitalsSample[]>()

export function vitalsFor(
  session: Session,
  participation: Participation,
  flags: Flag[],
): VitalsSample[] {
  const key = `${participation.sessionId}:${participation.athleteId}`
  const cached = vitalsCache.get(key)
  if (cached) return cached
  const athlete = athletes.find((item) => item.id === participation.athleteId)
  const random = mulberry32(hashString(key) || 1)
  const athleteFlags = flags.filter(
    (flag) => flag.sessionId === session.id && flag.athleteId === participation.athleteId,
  )
  const raw: number[] = []
  for (let i = 0; i < 540; i += 1) {
    const minute = i / 6
    raw.push(hrShape(minute, athlete?.restingHr ?? 60, athlete?.maxHr ?? 190, random))
  }
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length
  const shift = participation.avgHr - mean
  const peak = Math.max(...raw) + shift
  const scale = peak === 0 ? 1 : (participation.peakHr - participation.avgHr) / Math.max(8, peak - participation.avgHr)
  const samples: VitalsSample[] = raw.map((value, i) => {
    const minute = i / 6
    const hr = clamp(Math.round(participation.avgHr + (value + shift - participation.avgHr) * Math.min(1.4, Math.max(0.6, scale))), 48, 206)
    const rise = minute < 40 ? (minute / 40) * 0.4 : minute < 80 ? 0.4 + ((minute - 40) / 40) * 0.8 : 1.2 - ((minute - 80) / 10) * 0.5
    const spike = athleteFlags.some((flag) => Math.abs(flag.minute - minute) < 0.2)
    return {
      t: i * 10,
      hr,
      skinTemp: round1((athlete?.baselineSkinTemp ?? 34) + rise),
      accelG: Math.round((spike ? 2.4 + random() : 0.3 + random() * 0.5) * 100) / 100,
    }
  })
  vitalsCache.set(key, samples)
  return samples
}

function hrShape(minute: number, resting: number, max: number, random: () => number): number {
  const span = max - resting
  let target = resting + span * 0.35
  if (minute < 15) target = resting + span * (0.25 + minute / 50)
  else if (minute < 40) target = resting + span * 0.5
  else if (minute < 80) {
    const into = (minute - 40) % 8
    target = into > 7 ? resting + span * 0.42 : resting + span * 0.72
  } else target = resting + span * (0.4 - (minute - 80) / 40)
  return target + (random() - 0.5) * 8
}

export function landingCaption(flags: Flag[]): string {
  const landings = flags.filter(isRiskyLanding)
  if (landings.length === 0) return "No risky landings in this session."
  const zones = landings.map((flag) => flag.zone).filter(Boolean)
  const unique = new Set(zones)
  if (landings.length === 3 && unique.size === 1 && zones[0] === "shoulder_r") {
    return "All 3 risky landings on the right shoulder."
  }
  return `${landings.length} risky landing${landings.length === 1 ? "" : "s"} in this session.`
}

export function thermalZones(athlete: Athlete): Record<BodyZone, number> {
  const random = mulberry32(hashString(athlete.id + "thermal"))
  const zones = {} as Record<BodyZone, number>
  for (const zone of ALL_ZONES) {
    zones[zone] = round1(athlete.baselineSkinTemp + random() * 0.6)
  }
  if (athlete.id === JACK_ID) {
    zones.shoulder_l = 34.2
    zones.shoulder_r = 35.0
  }
  return zones
}

export function thermalCaption(athlete: Athlete, zones: Record<BodyZone, number>): string {
  if (athlete.id === JACK_ID) {
    return "Right shoulder 0.8°C warmer than left after the last session. Relative reading, not medical."
  }
  const pairs: [BodyZone, BodyZone, string][] = [
    ["shoulder_l", "shoulder_r", "shoulder"],
    ["knee_l", "knee_r", "knee"],
    ["hip_l", "hip_r", "hip"],
  ]
  let best = { name: "shoulder", diff: 0, warmer: "right" }
  for (const [left, right, name] of pairs) {
    const diff = round1(zones[right] - zones[left])
    if (Math.abs(diff) > Math.abs(best.diff)) {
      best = { name, diff, warmer: diff >= 0 ? "right" : "left" }
    }
  }
  const amount = Math.abs(best.diff).toFixed(1)
  return `${best.warmer === "right" ? "Right" : "Left"} ${best.name} ${amount}°C warmer than the other side after the last session. Relative reading, not medical.`
}

export { countKind }
