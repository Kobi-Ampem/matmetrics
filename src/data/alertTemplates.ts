import type { FlagKind } from "../types"
import { pick } from "./rng"

const MOVES = [
  "hip throw",
  "double-leg",
  "single-leg",
  "headlock",
  "arm drag",
  "gut wrench",
  "suplex",
  "ankle pick",
  "duck-under",
] as const

const SITUATIONS = [
  "sprawl defence",
  "scramble",
  "single-leg defence",
  "front headlock",
  "par terre",
] as const

const TEMPLATES: Record<FlagKind, string[]> = {
  neck_landing: [
    "Landed on head and neck after a {move}",
    "Head and neck took the landing on a {move}",
    "Head contacted the mat first on a {move}",
  ],
  shoulder_landing: [
    "Landed on point of {side} shoulder during {situation}",
    "Point of the {side} shoulder took the fall in a {situation}",
    "{side} shoulder posted late during {situation}",
  ],
  back_slam: [
    "Back hit the mat flat after a {move}",
    "Uncontrolled back landing on a {move}",
    "Hips came through and the back landed hard on a {move}",
  ],
  knee_twist: [
    "Knee twisted on planted foot during {situation}",
    "Planted foot stayed down while the knee turned in a {situation}",
    "Knee rotated on a fixed foot during {situation}",
  ],
  mat_edge: [
    "Close to mat edge during takedown",
    "Pair drifted to the mat edge on a {move}",
    "Finish started inside the boundary line",
  ],
  high_hr_sustained: [
    "Heart rate above {hr} bpm for {min} minutes",
    "Heart rate stayed over {hr} bpm for {min} minutes",
    "Sustained heart rate above {hr} bpm across {min} minutes",
  ],
  temp_rise: [
    "Skin temperature rising faster than the usual pattern",
    "Skin temperature climbed earlier than this athlete's baseline",
    "Skin temperature rise is ahead of the usual session curve",
  ],
  hips_high_shot: [
    "Hips rose before the level change on a {move}",
    "Hips stayed high into the shot on a {move}",
    "Level change came after the hips lifted on a {move}",
  ],
  fatigue_slowdown: [
    "Shot speed dropped late in the round while heart rate stayed high",
    "Entries slowed in the last rounds with heart rate still elevated",
    "Movement slowed late in the session as heart rate stayed high",
  ],
  good_finish: [
    "Clean finish on {move}, safe landing for both athletes",
    "Controlled finish on a {move} with a safe landing",
    "Finished the {move} and both athletes landed safely",
  ],
}

export function describeFlag(
  kind: FlagKind,
  side: "left" | "right" = "right",
  random: () => number = Math.random,
): string {
  const template = pick(TEMPLATES[kind], random)
  return template
    .replaceAll("{move}", pick(MOVES, random))
    .replaceAll("{situation}", pick(SITUATIONS, random))
    .replaceAll("{side}", side)
    .replaceAll("{hr}", "175")
    .replaceAll("{min}", "8")
}

export const COACHING_CUES: Record<FlagKind, string> = {
  neck_landing: "tuck the chin and roll across the shoulders instead of posting the head",
  shoulder_landing: "post the hand and roll through the back of the shoulder",
  back_slam: "keep the hips in and turn the corner instead of arching through",
  knee_twist: "step the foot with the turn so the knee does not twist on a planted foot",
  mat_edge: "finish toward the centre and reset before the boundary",
  high_hr_sustained: "use the full rest minute and drop the pace for one round",
  temp_rise: "extend the warm-up and watch the rise against this athlete's usual curve",
  hips_high_shot: "drop the level before stepping in",
  fatigue_slowdown: "shorten the live rounds when shot speed drops",
  good_finish: "repeat the same finish and the same safe landing",
}
