import type { Camera, Flag } from "../types"
import { DEMO_SESSION_ID } from "../types"
import { mulberry32 } from "./rng"
import { sessionClock } from "../utils/format"

export const LIVE_START_SEC = 57 * 60 + 20
export const SESSION_LENGTH_SEC = 90 * 60

function mins(min: number, sec: number): number {
  return min + sec / 60
}

function flag(partial: {
  id: string
  athleteId: string
  opponentId?: string
  kind: Flag["kind"]
  level: Flag["level"]
  minute: number
  zone?: Flag["zone"]
  cameras: Camera["id"][]
  source: Flag["source"]
  description: string
}): Flag {
  return {
    ...partial,
    sessionId: DEMO_SESSION_ID,
    clock: sessionClock("18:30", partial.minute),
    seen: false,
  }
}

export const storyFlags: Flag[] = [
  flag({
    id: "f-lucas-neck",
    athleteId: "a03",
    opponentId: "a05",
    kind: "neck_landing",
    level: "high",
    minute: mins(22, 14),
    zone: "head_neck",
    cameras: ["cam2", "cam3"],
    source: "camera",
    description: "Landed on head and neck after a hip throw",
  }),
  flag({
    id: "f-chloe-hr",
    athleteId: "a07",
    opponentId: "a04",
    kind: "high_hr_sustained",
    level: "med",
    minute: mins(34, 40),
    cameras: [],
    source: "wristband",
    description: "Heart rate above 175 bpm for 8 minutes",
  }),
  flag({
    id: "f-jack-sh-1",
    athleteId: "a01",
    opponentId: "a09",
    kind: "shoulder_landing",
    level: "med",
    minute: mins(39, 58),
    zone: "shoulder_r",
    cameras: ["cam1"],
    source: "camera",
    description: "Landed on right shoulder during sprawl defence",
  }),
  flag({
    id: "f-jack-sh-2",
    athleteId: "a01",
    opponentId: "a09",
    kind: "shoulder_landing",
    level: "med",
    minute: mins(41, 3),
    zone: "shoulder_r",
    cameras: ["cam1", "cam4"],
    source: "camera",
    description: "Landed on point of right shoulder, second time in two minutes",
  }),
  flag({
    id: "f-samuel-edge",
    athleteId: "a05",
    opponentId: "a03",
    kind: "mat_edge",
    level: "low",
    minute: mins(45, 27),
    cameras: ["cam3"],
    source: "camera",
    description: "Close to mat edge during takedown",
  }),
  flag({
    id: "f-lucas-knee",
    athleteId: "a03",
    opponentId: "a05",
    kind: "knee_twist",
    level: "high",
    minute: mins(52, 9),
    zone: "knee_r",
    cameras: ["cam2"],
    source: "camera",
    description: "Knee twisted on planted foot during scramble",
  }),
  flag({
    id: "f-jack-hips",
    athleteId: "a01",
    opponentId: "a09",
    kind: "hips_high_shot",
    level: "low",
    minute: mins(52, 30),
    cameras: ["cam3"],
    source: "camera",
    description: "Hips rose before the level change on a double-leg",
  }),
  flag({
    id: "f-emily-temp",
    athleteId: "a02",
    opponentId: "a06",
    kind: "temp_rise",
    level: "low",
    minute: mins(56, 45),
    cameras: [],
    source: "combined",
    description: "Skin temperature rising faster than her usual pattern",
  }),
  flag({
    id: "f-jack-sh-3",
    athleteId: "a01",
    opponentId: "a09",
    kind: "shoulder_landing",
    level: "med",
    minute: mins(61, 40),
    zone: "shoulder_r",
    cameras: ["cam4"],
    source: "camera",
    description: "Landed on right shoulder during single-leg defence",
  }),
  flag({
    id: "f-ines-knee",
    athleteId: "a04",
    opponentId: "a07",
    kind: "knee_twist",
    level: "high",
    minute: mins(63, 5),
    zone: "knee_l",
    cameras: ["cam1"],
    source: "camera",
    description: "Knee twisted on planted foot during scramble",
  }),
  flag({
    id: "f-thomas-hr",
    athleteId: "a14",
    opponentId: "a13",
    kind: "high_hr_sustained",
    level: "med",
    minute: mins(66, 30),
    cameras: [],
    source: "wristband",
    description: "Heart rate above 175 bpm for 8 minutes",
  }),
  flag({
    id: "f-jack-finish",
    athleteId: "a01",
    opponentId: "a09",
    kind: "good_finish",
    level: "positive",
    minute: mins(74, 15),
    cameras: ["cam2"],
    source: "camera",
    description: "Clean finish on a single-leg, safe landing for both athletes",
  }),
  flag({
    id: "f-leo-neck",
    athleteId: "a11",
    opponentId: "a06",
    kind: "neck_landing",
    level: "high",
    minute: mins(77, 50),
    zone: "head_neck",
    cameras: ["cam2", "cam3"],
    source: "camera",
    description: "Landed on head and neck after a hip throw",
  }),
]

function fillerFlags(): Flag[] {
  const random = mulberry32(20261118)
  const pool = ["a04", "a08", "a09", "a10", "a12", "a13", "a16", "a18", "a05", "a02"]
  const flags: Flag[] = []
  let minute = 59.5
  let i = 0
  while (minute < 88) {
    const kind = i % 2 === 0 ? "mat_edge" : "temp_rise"
    const athleteId = pool[i % pool.length] ?? "a08"
    flags.push(
      flag({
        id: `f-filler-${i}`,
        athleteId,
        kind,
        level: "low",
        minute,
        cameras: kind === "mat_edge" ? ["cam3"] : [],
        source: kind === "mat_edge" ? "camera" : "wristband",
        description:
          kind === "mat_edge"
            ? "Close to mat edge during takedown"
            : "Skin temperature rising faster than the usual pattern",
      }),
    )
    minute += 2.4 + random() * 1.4
    i += 1
  }
  return flags
}

export const nov17Flags: Flag[] = [...storyFlags, ...fillerFlags()].sort((a, b) => a.minute - b.minute)

export function flagsBefore(sec: number): Flag[] {
  return nov17Flags.filter((item) => item.minute * 60 <= sec).sort((a, b) => b.minute - a.minute)
}

export function flagsBetween(fromSec: number, toSec: number): Flag[] {
  return nov17Flags
    .filter((item) => item.minute * 60 > fromSec && item.minute * 60 <= toSec)
    .sort((a, b) => b.minute - a.minute)
}

export function blockTitle(elapsedSec: number): string {
  const minute = elapsedSec / 60
  if (minute < 15) return "Warm-up"
  if (minute < 40) return "Technique"
  if (minute >= 80) return "Cool-down"
  const round = Math.min(5, Math.floor((minute - 40) / 8) + 1)
  return `Live sparring, round ${round} of 5`
}

export const OPENING_PAIRS: { id: string; a: string; b: string }[] = [
  { id: "p1", a: "a01", b: "a09" },
  { id: "p2", a: "a03", b: "a05" },
  { id: "p3", a: "a07", b: "a04" },
  { id: "p4", a: "a02", b: "a06" },
  { id: "p5", a: "a08", b: "a10" },
  { id: "p6", a: "a13", b: "a14" },
  { id: "p7", a: "a12", b: "a15" },
]

export const ROUND5_PAIRS: { id: string; a: string; b: string }[] = [
  { id: "p1", a: "a01", b: "a09" },
  { id: "p2", a: "a03", b: "a05" },
  { id: "p3", a: "a07", b: "a04" },
  { id: "p4", a: "a02", b: "a11" },
  { id: "p5", a: "a08", b: "a17" },
  { id: "p6", a: "a13", b: "a16" },
  { id: "p7", a: "a12", b: "a18" },
]
