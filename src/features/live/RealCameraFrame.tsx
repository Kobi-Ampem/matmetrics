import { useEffect, useState, useSyncExternalStore } from "react"
import { CameraFrame } from "../../components/visuals/CameraFrame"
import { cameraFeeds, type CameraFeed } from "../../state/cameraFeeds"
import type { Camera, Flag, PoseFrame } from "../../types"
import { coverMap, VIEW_H, VIEW_W, type Point } from "../camera/poseMapping"

const STALE_MS = 3000
const MIN_VISIBILITY = 0.5
// Big enough for the "RISK · NECK LANDING" label even when the person is small or far away.
const MIN_BOX = { width: 34, height: 30 }
// Must match server/edge/cameras.py PEOPLE: left person is Jack Miller, right is Noah Petit.
const RIGHT_PERSON = "a09"

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return now
}

/** Keypoints into the frame's 320x180 view, cropped like the picture (`object-fit: cover`). */
function toView(feed: CameraFeed, person: number): Point[] {
  const points = feed.people[person] ?? []
  // Points the model cannot see become NaN, which the skeleton skips.
  return points.map(([x, y, visibility]) =>
    visibility < MIN_VISIBILITY ? [Number.NaN, Number.NaN] : coverMap({ x, y }, feed.width, feed.height, false),
  )
}

function boxAround(points: Point[]) {
  const seen = points.filter(([x]) => !Number.isNaN(x))
  if (seen.length === 0) return undefined
  const xs = seen.map(([x]) => x)
  const ys = seen.map(([, y]) => y)
  const pad = 8
  const left = Math.max(0, Math.min(...xs) - pad)
  const top = Math.max(0, Math.min(...ys) - pad)
  const right = Math.min(VIEW_W, Math.max(...xs) + pad)
  const bottom = Math.min(VIEW_H, Math.max(...ys) + pad)
  const width = Math.max(MIN_BOX.width, ((right - left) / VIEW_W) * 100)
  const height = Math.max(MIN_BOX.height, ((bottom - top) / VIEW_H) * 100)
  // Grow around the person's centre, then keep the box inside the frame.
  const centreX = ((left + right) / 2 / VIEW_W) * 100
  const centreY = ((top + bottom) / 2 / VIEW_H) * 100
  return {
    left: Math.min(100 - width, Math.max(0, centreX - width / 2)),
    top: Math.min(100 - height, Math.max(0, centreY - height / 2)),
    width,
    height,
  }
}

export function RealCameraFrame({
  camera,
  flag,
  size,
  onClick,
}: {
  camera: Camera
  flag?: Flag
  size?: "full" | "strip"
  onClick?: () => void
}) {
  const feed = useSyncExternalStore(cameraFeeds.subscribe, () => cameraFeeds.get(camera.id))
  const now = useNow(1000)
  const live = feed !== undefined && now - feed.at < STALE_MS
  const pose: PoseFrame = live ? { a: toView(feed, 0), b: toView(feed, 1) } : { a: [], b: [] }
  const person = flag?.athleteId === RIGHT_PERSON ? "b" : "a"

  return (
    <CameraFrame
      camera={camera}
      pose={pose}
      flag={flag}
      highlight={person}
      size={size}
      onClick={onClick}
      status="online"
      media={live && feed.image ? <img src={feed.image} alt="" /> : null}
      notice={live ? undefined : "NO SIGNAL · open /camera on a phone"}
      box={flag ? boxAround(pose[person]) : undefined}
    />
  )
}
