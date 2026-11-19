export type RiskLevel = "high" | "med" | "low"
export type Style = "Freestyle" | "Greco-Roman"
export type Level = "Beginner" | "Intermediate" | "Competitive"
export type BodyZone =
  | "head_neck"
  | "shoulder_l"
  | "shoulder_r"
  | "upper_back"
  | "lower_back"
  | "hip_l"
  | "hip_r"
  | "knee_l"
  | "knee_r"
  | "ankle_l"
  | "ankle_r"

export type FlagKind =
  | "neck_landing"
  | "shoulder_landing"
  | "back_slam"
  | "knee_twist"
  | "mat_edge"
  | "high_hr_sustained"
  | "temp_rise"
  | "hips_high_shot"
  | "fatigue_slowdown"
  | "good_finish"

export interface Club {
  id: string
  name: string
  city: string
  mats: number
}

export interface Coach {
  id: string
  name: string
  role: string
  initials: string
}

export interface Athlete {
  id: string
  name: string
  initials: string
  sex: "M" | "F"
  age: number
  weightKg: number
  style: Style
  level: Level
  memberSince: string
  restingHr: number
  maxHr: number
  baselineSkinTemp: number
  riskProfile: {
    preferredZone: BodyZone
    baseFlagRate: number
    improvementPerWeek: number
  }
  bandId: string
}

export interface RoomProfile {
  id: string
  name: string
  minC: number
  maxC: number
}

export interface Camera {
  id: "cam1" | "cam2" | "cam3" | "cam4"
  label: string
  position: "N" | "E" | "S" | "W"
  status: "online" | "warning" | "offline"
  resolution: string
  fps: number
}

export interface Session {
  id: string
  date: string
  start: string
  end: string
  type: "Technique" | "Live sparring" | "Conditioning" | "Competition prep"
  coachId: string
  roomTempC: number
  humidity: number
  roomProfileId: string
  blocks: { name: string; startMin: number; endMin: number }[]
  week: string
  weekIndex: number
}

export interface Participation {
  sessionId: string
  athleteId: string
  minutesOnMat: number
  avgHr: number
  peakHr: number
  minutesAbove170: number
  takedownAttempts: number
  takedownsCompleted: number
  shotsDefended: number
  shotsFaced: number
  load: number
  skinTempPeak: number
}

export interface Flag {
  id: string
  sessionId: string
  athleteId: string
  opponentId?: string
  kind: FlagKind
  level: RiskLevel | "positive"
  minute: number
  clock: string
  zone?: BodyZone
  cameras: Camera["id"][]
  source: "camera" | "wristband" | "thermal" | "combined"
  description: string
  seen: boolean
}

export interface VitalsSample {
  t: number
  hr: number
  skinTemp: number
  accelG: number
}

export interface WeeklyProgress {
  athleteId: string
  week: string
  weekIndex: number
  riskyLandingsPerSession: number
  takedownSuccessPct: number
  avgLoad: number
  sessions: number
}

export interface Exercise {
  id: string
  name: string
  category:
    | "general"
    | "mobility"
    | "shoulder"
    | "neck"
    | "hips"
    | "knees"
    | "falls"
    | "technique"
    | "partner"
  defaultMin: number
}

export interface WarmupStep {
  exerciseId: string
  minutes: number
  reason: string
  change: "standard" | "added" | "adjusted"
}

export interface WarmupPlan {
  athleteId: string
  date: string
  steps: WarmupStep[]
  notes: string[]
  status: "suggested" | "approved" | "standard"
}

export interface Device {
  id: string
  kind: "edge" | "router" | "thermal" | "band"
  label: string
  status: "online" | "warning" | "offline"
  battery?: number
  firmware?: string
  lastSeen: string
  detail: string
  athleteId?: string
  updateAvailable?: boolean
}

export interface ConsentSettings {
  athleteId: string
  shareVitals: boolean
  shareVideo: boolean
  research: boolean
  cloudBackup: boolean
  consentDate: string
  parentConsent?: string
}

export interface PoseFrame {
  a: [number, number][]
  b: [number, number][]
}

export const BODY_ZONES: BodyZone[] = [
  "head_neck",
  "shoulder_l",
  "shoulder_r",
  "upper_back",
  "lower_back",
  "hip_l",
  "hip_r",
  "knee_l",
  "knee_r",
  "ankle_l",
  "ankle_r",
]

export const DEMO_TODAY = "2026-11-17"
export const DEMO_SESSION_ID = "s2026-11-17"
export const JACK_ID = "a01"
