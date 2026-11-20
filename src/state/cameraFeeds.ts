import type { Camera } from "../types"

// The latest frame from each camera phone. Frames arrive several times a second from four
// phones, so they live outside React state: only the camera frames that show them re-render.

export type Keypoint = [number, number, number] // x, y, visibility, each 0 to 1

export interface CameraFeed {
  people: Keypoint[][]
  image: string | null
  width: number
  height: number
  at: number // Date.now() when it arrived
}

const feeds = new Map<Camera["id"], CameraFeed>()
const listeners = new Set<() => void>()

export const cameraFeeds = {
  push(cam: Camera["id"], feed: Omit<CameraFeed, "at">) {
    const previous = feeds.get(cam)
    // A frame without a picture keeps the last picture, so the video does not flicker.
    feeds.set(cam, { ...feed, image: feed.image ?? previous?.image ?? null, at: Date.now() })
    listeners.forEach((listener) => listener())
  },
  get(cam: Camera["id"]): CameraFeed | undefined {
    return feeds.get(cam)
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
