import { useEffect, useState } from "react"
import { POSE_LOOP, POSES, type PoseKey } from "../../data/poses"
import { lerpPose } from "../../components/visuals/PoseSkeleton"
import type { PoseFrame } from "../../types"

export function usePoseClock(active: boolean): number {
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!active) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const loop = (now: number) => {
      setTime((now - start) / 1000)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [active])
  return time
}

export function poseAt(time: number, offset = 0): PoseFrame {
  const span = 1.5
  const length = POSE_LOOP.length - 1
  const pos = Math.max(0, time) / span + offset
  const index = Math.floor(pos) % length
  const t = pos - Math.floor(pos)
  const fromKey = POSE_LOOP[index] ?? "stance"
  const toKey = POSE_LOOP[index + 1] ?? "stance"
  return lerpPose(POSES[fromKey], POSES[toKey], t)
}

export function poseForKind(kind: string): PoseKey {
  if (kind === "hips_high_shot") return "shot"
  if (kind === "good_finish") return "throw"
  if (kind === "neck_landing" || kind === "shoulder_landing" || kind === "back_slam") return "landing"
  if (kind === "knee_twist") return "sprawl"
  return "stance"
}
