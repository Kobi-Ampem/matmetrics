import type { Camera } from "../types"

// The latest keypoints and picture from each camera phone. They arrive several times a second
// from four phones, so they live outside React state: only the camera frames re-render.

export type Keypoint = [number, number, number] // x, y, visibility, each 0 to 1

export interface CameraFeed {
  people: Keypoint[][]
  width: number
  height: number
  image: string | null
  at: number // Date.now() when the last keypoints arrived
  // How long from the phone taking the picture to the edge server receiving it, in ms.
  poseDelayMs: number
  imageDelayMs: number | null
}

const feeds = new Map<Camera["id"], CameraFeed>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

export const cameraFeeds = {
  pushPose(
    cam: Camera["id"],
    pose: { people: Keypoint[][]; width: number; height: number; capturedAt: number; receivedAt: number },
  ) {
    const previous = feeds.get(cam)
    feeds.set(cam, {
      people: pose.people,
      width: pose.width,
      height: pose.height,
      image: previous?.image ?? null,
      imageDelayMs: previous?.imageDelayMs ?? null,
      at: Date.now(),
      poseDelayMs: Math.max(0, pose.receivedAt - pose.capturedAt),
    })
    emit()
  },
  pushImage(cam: Camera["id"], picture: { image: string; capturedAt: number; receivedAt: number }) {
    const previous = feeds.get(cam)
    // A picture before any keypoints has nothing to line up with yet; wait for the keypoints.
    if (!previous) return
    feeds.set(cam, {
      ...previous,
      image: picture.image,
      imageDelayMs: Math.max(0, picture.receivedAt - picture.capturedAt),
    })
    emit()
  },
  get(cam: Camera["id"]): CameraFeed | undefined {
    return feeds.get(cam)
  },
  /** Changes whenever any camera sends; for views that show all four. */
  version(): number {
    return version
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
