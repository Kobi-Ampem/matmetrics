import type { Flag, RiskLevel } from "../types"

const RANK: Record<string, number> = { high: 3, med: 2, low: 1, positive: 0 }

export function riskLabel(level: RiskLevel | "positive" | "ok" | "neutral"): string {
  if (level === "high") return "High"
  if (level === "med") return "Med"
  if (level === "low") return "Low"
  if (level === "positive") return "Positive"
  if (level === "ok") return "Ok"
  return "Neutral"
}

export function highestLevel(flags: Flag[]): RiskLevel | "positive" | null {
  let best: RiskLevel | "positive" | null = null
  let score = -1
  for (const flag of flags) {
    const value = RANK[flag.level] ?? 0
    if (value > score) {
      score = value
      best = flag.level
    }
  }
  return best
}

export function isRiskyLanding(flag: Flag): boolean {
  return (
    flag.level !== "positive" &&
    (flag.kind === "neck_landing" ||
      flag.kind === "shoulder_landing" ||
      flag.kind === "back_slam" ||
      flag.kind === "knee_twist")
  )
}

export const ZONE_LABEL: Record<string, string> = {
  head_neck: "Head / neck",
  shoulder_l: "Left shoulder",
  shoulder_r: "Right shoulder",
  upper_back: "Upper back",
  lower_back: "Lower back",
  hip_l: "Left hip",
  hip_r: "Right hip",
  knee_l: "Left knee",
  knee_r: "Right knee",
  ankle_l: "Left ankle",
  ankle_r: "Right ankle",
  shoulder: "Shoulder",
  back: "Back",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
  mat_edge: "Mat edge",
}

export function zoneGroup(zone: string | undefined, kind: string): string {
  if (kind === "mat_edge") return "mat_edge"
  if (!zone) return "other"
  if (zone.startsWith("shoulder")) return "shoulder"
  if (zone.endsWith("back")) return "back"
  if (zone.startsWith("hip")) return "hip"
  if (zone.startsWith("knee")) return "knee"
  if (zone.startsWith("ankle")) return "ankle"
  if (zone === "head_neck") return "head_neck"
  return "other"
}
