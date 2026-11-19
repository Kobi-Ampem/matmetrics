import type { Athlete, Flag, FlagKind } from "../types"
import { DEMO_SESSION_ID, JACK_ID } from "../types"
import { COACHING_CUES } from "./alertTemplates"
import { ZONE_LABEL } from "../utils/risk"

const JACK_SUMMARY =
  "You landed on your right shoulder three times, each time while defending a leg attack. Your hips rose before your level change on some of your shots, which slows them down. Next session, focus on posting your hand and rolling through the back of the shoulder, and on dropping your level before you step in."

export function buildSummary(athlete: Athlete, sessionId: string, flags: Flag[]): { text: string; focus: string[] } {
  if (athlete.id === JACK_ID && sessionId === DEMO_SESSION_ID) {
    return {
      text: JACK_SUMMARY,
      focus: [
        "Post your hand and roll through the back of the shoulder.",
        "Drop your level before you step in.",
      ],
    }
  }
  const risky = flags.filter((flag) => flag.level !== "positive")
  const counts = new Map<string, { kind: FlagKind; zone?: string; n: number }>()
  for (const flag of risky) {
    const key = `${flag.kind}:${flag.zone ?? ""}`
    const current = counts.get(key) ?? { kind: flag.kind, zone: flag.zone, n: 0 }
    current.n += 1
    counts.set(key, current)
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0]
  const zoneName = top?.zone ? ZONE_LABEL[top.zone]?.toLowerCase() : ""
  const pattern = top ? patternName(top.kind, zoneName) : "no repeated risk pattern"
  const sentence1 = top
    ? `You had ${top.n} ${pattern}${top.n === 1 ? "" : "s"} in this session.`
    : "This session did not add a repeated risk pattern."
  const hips = risky.some((flag) => flag.kind === "hips_high_shot")
  const fatigue = risky.some((flag) => flag.kind === "fatigue_slowdown")
  const positive = flags.some((flag) => flag.kind === "good_finish")
  const sentence2 = hips
    ? "Your hips rose before the level change on some shots."
    : fatigue
      ? "Movement slowed late in the session while heart rate stayed high."
      : positive
        ? "There was a clean finish with a safe landing."
        : "The rest of the session stayed close to the usual pattern."
  const cueKind = top?.kind ?? "good_finish"
  const sentence3 = `Next session, focus on ${COACHING_CUES[cueKind]}.`
  const focusKind = hips ? "hips_high_shot" : cueKind
  return {
    text: `${sentence1} ${sentence2} ${sentence3}`,
    focus: [sentenceCase(COACHING_CUES[focusKind]) + ".", sentenceCase(COACHING_CUES[cueKind === focusKind ? "good_finish" : cueKind]) + "."],
  }
}

function patternName(kind: FlagKind, zone: string): string {
  if (kind === "shoulder_landing") return zone ? `${zone} landing` : "shoulder landing"
  if (kind === "neck_landing") return "head and neck landing"
  if (kind === "back_slam") return "back landing"
  if (kind === "knee_twist") return "knee twist"
  if (kind === "mat_edge") return "mat-edge moment"
  if (kind === "high_hr_sustained") return "sustained high heart-rate spell"
  if (kind === "temp_rise") return "faster skin-temperature rise"
  if (kind === "hips_high_shot") return "hips-high shot"
  if (kind === "fatigue_slowdown") return "late slowdown"
  return "marked moment"
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
