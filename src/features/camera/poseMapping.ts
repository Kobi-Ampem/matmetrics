import type { PoseFrame } from "../../types"

export type Point = [number, number]

export interface Landmark {
  x: number
  y: number
  visibility?: number
}

export interface MappedPose {
  points: Point[]
  visibility: number[]
}

export const VIEW_W = 320
export const VIEW_H = 180
const MIN_VISIBILITY = 0.5

const COCO_FROM_MEDIAPIPE = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

export function toCoco17(landmarks: Landmark[]): Landmark[] {
  return COCO_FROM_MEDIAPIPE.map((index) => landmarks[index] ?? { x: 0, y: 0, visibility: 0 })
}

/** Maps a normalised landmark into the 320x180 viewBox the way `object-fit: cover` crops the video. */
export function coverMap(point: Landmark, videoW: number, videoH: number, mirror: boolean): Point {
  const scale = Math.max(VIEW_W / videoW, VIEW_H / videoH)
  const offsetX = (VIEW_W - videoW * scale) / 2
  const offsetY = (VIEW_H - videoH * scale) / 2
  const x = point.x * videoW * scale + offsetX
  const y = point.y * videoH * scale + offsetY
  return [mirror ? VIEW_W - x : x, y]
}

export function mapPose(landmarks: Landmark[], videoW: number, videoH: number, mirror: boolean): MappedPose {
  const coco = toCoco17(landmarks)
  return {
    points: coco.map((point) => coverMap(point, videoW, videoH, mirror)),
    visibility: coco.map((point) => point.visibility ?? 1),
  }
}

function hipX(points: Point[]): number | null {
  const left = points[11]
  const right = points[12]
  if (!left || !right) return null
  return (left[0] + right[0]) / 2
}

/** Left person on screen is `a`, right is `b`. A lone person keeps whichever slot was nearest last frame. */
export function assignPeople(
  poses: MappedPose[],
  previous: PoseFrame,
): { a: MappedPose | null; b: MappedPose | null } {
  if (poses.length === 0) return { a: null, b: null }
  if (poses.length >= 2) {
    const [first, second] = [...poses].sort((p, q) => (hipX(p.points) ?? 0) - (hipX(q.points) ?? 0))
    return { a: first, b: second }
  }
  const only = poses[0]
  const x = hipX(only.points) ?? VIEW_W / 2
  const prevA = hipX(previous.a)
  const prevB = hipX(previous.b)
  if (prevA === null && prevB === null) return { a: only, b: null }
  if (prevB === null) return { a: only, b: null }
  if (prevA === null) return { a: null, b: only }
  return Math.abs(x - prevA) <= Math.abs(x - prevB) ? { a: only, b: null } : { a: null, b: only }
}

/** Exponential smoothing. A landmark the model cannot see keeps its last position. */
export function smooth(prev: Point[], next: MappedPose | null, alpha: number): Point[] {
  if (!next) return []
  if (prev.length !== next.points.length) return next.points
  return next.points.map((point, index) => {
    const last = prev[index]
    if (next.visibility[index] < MIN_VISIBILITY) return last
    return [last[0] + (point[0] - last[0]) * alpha, last[1] + (point[1] - last[1]) * alpha] as Point
  })
}
