import type {
  Athlete,
  ConsentSettings,
  Device,
  Flag,
  Participation,
  Session,
  WarmupPlan,
  WeeklyProgress,
} from "../types"
import { athletes } from "./athletes"
import { cameras, club, coaches, network, rooms } from "./club"
import { exercises } from "./exercises"
import {
  applyDemoParticipation,
  buildConsents,
  buildDevices,
  buildFlags,
  buildFps,
  buildParticipations,
  buildSessions,
  buildWarmups,
  buildWeekly,
  landingCaption,
  thermalCaption,
  thermalZones,
  vitalsFor,
} from "./generators"
import { buildSummary } from "./summaries"

export interface MockDb {
  club: typeof club
  network: typeof network
  coaches: typeof coaches
  athletes: Athlete[]
  rooms: typeof rooms
  cameras: typeof cameras
  devices: Device[]
  sessions: Session[]
  participations: Participation[]
  flags: Flag[]
  weekly: WeeklyProgress[]
  exercises: typeof exercises
  warmups: WarmupPlan[]
  consents: ConsentSettings[]
  fps: number[]
}

function createDb(): MockDb {
  const sessions = buildSessions()
  const participations = applyDemoParticipation(buildParticipations(sessions), sessions)
  const flags = buildFlags(sessions, participations)
  const weekly = buildWeekly(sessions, participations, flags)
  return {
    club,
    network,
    coaches,
    athletes,
    rooms,
    cameras,
    devices: buildDevices(),
    sessions,
    participations,
    flags,
    weekly,
    exercises,
    warmups: buildWarmups(sessions, participations, flags),
    consents: buildConsents(),
    fps: buildFps(),
  }
}

export const mockDb: MockDb = createDb()

export function athleteById(id: string): Athlete | undefined {
  return mockDb.athletes.find((athlete) => athlete.id === id)
}

export function sessionById(id: string): Session | undefined {
  return mockDb.sessions.find((session) => session.id === id)
}

export function participationFor(sessionId: string, athleteId: string): Participation | undefined {
  return mockDb.participations.find((row) => row.sessionId === sessionId && row.athleteId === athleteId)
}

export function flagsFor(sessionId: string, athleteId?: string): Flag[] {
  return mockDb.flags
    .filter((flag) => flag.sessionId === sessionId && (athleteId ? flag.athleteId === athleteId : true))
    .sort((a, b) => a.minute - b.minute)
}

export function summaryFor(sessionId: string, athleteId: string) {
  const athlete = athleteById(athleteId)
  if (!athlete) return { text: "", focus: [] as string[] }
  return buildSummary(athlete, sessionId, flagsFor(sessionId, athleteId))
}

export function vitalsForReview(sessionId: string, athleteId: string) {
  const session = sessionById(sessionId)
  const participation = participationFor(sessionId, athleteId)
  if (!session || !participation) return []
  return vitalsFor(session, participation, mockDb.flags)
}

export { landingCaption, thermalCaption, thermalZones }
