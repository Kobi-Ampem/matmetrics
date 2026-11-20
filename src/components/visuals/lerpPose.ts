import type { PoseFrame } from "../../types"

export function lerpPose(from: PoseFrame, to: PoseFrame, t: number): PoseFrame {
  const mix = (a: [number, number][], b: [number, number][]) =>
    a.map((point, index) => {
      const other = b[index] ?? point
      return [point[0] + (other[0] - point[0]) * t, point[1] + (other[1] - point[1]) * t] as [number, number]
    })
  return { a: mix(from.a, to.a), b: mix(from.b, to.b) }
}
