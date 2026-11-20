import { useCallback, useEffect, useRef, useState } from "react"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"
import type { Camera, PoseFrame } from "../../types"
import type { Keypoint } from "../../state/cameraFeeds"
import { createLandmarker, EDGE_ASSETS, type CameraStatus } from "../camera/usePoseCamera"
import { coverMap, toCoco17 } from "../camera/poseMapping"

// Keypoints are tiny (about 1 KB) and drive both the fall rules and the skeleton on the coach
// screen, so they go often and up to two at a time. Pictures are larger and only for show, so
// they go less often, one at a time, and never hold the keypoints up.
const DETECT_EVERY_MS = 100
const POSES_IN_FLIGHT = 2
const IMAGE_EVERY_MS = 250
const IMAGE_LONG_SIDE = 360
const JPEG_QUALITY = 0.5
// The phone counts as moving for this long after its motion sensor last saw a jolt.
const MOVING_HOLD_MS = 800
const ROTATION_LIMIT = 25 // degrees per second
const ACCELERATION_LIMIT = 1.2 // m/s², gravity excluded
const EMPTY: PoseFrame = { a: [], b: [] }

function isSupported() {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
}

function hipX(person: Keypoint[]): number {
  return ((person[11]?.[0] ?? 0.5) + (person[12]?.[0] ?? 0.5)) / 2
}

/** How far this phone's clock is from the edge server's, from the quickest of five round trips. */
async function clockOffset(): Promise<number> {
  let best = { rtt: Infinity, offset: 0 }
  for (let i = 0; i < 5; i += 1) {
    const sent = Date.now()
    try {
      const { now } = (await (await fetch("/api/time")).json()) as { now: number }
      const back = Date.now()
      if (back - sent < best.rtt) best = { rtt: back - sent, offset: now - (sent + back) / 2 }
    } catch {
      // One failed round trip is fine; the others still count.
    }
  }
  return best.offset
}

/** iPhones only share motion data after the user allows it, and only from a tap. */
async function askForMotion(): Promise<boolean> {
  const Motion = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  if (!Motion) return false
  if (!Motion.requestPermission) return true
  return (await Motion.requestPermission().catch(() => "denied")) === "granted"
}

export interface SendStats {
  poseFps: number
  imageFps: number
  moving: boolean
  portrait: boolean
}

/**
 * Turns this phone into one of the four mat cameras: runs pose detection on the phone and
 * streams keypoints and small pictures to the edge server.
 */
export function useCameraNode() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const wakeRef = useRef<WakeLockSentinel | null>(null)
  const cleanupRef = useRef<() => void>(() => undefined)
  const rafRef = useRef(0)
  const sessionRef = useRef(0)

  const [status, setStatus] = useState<CameraStatus>(() => (isSupported() ? "idle" : "unsupported"))
  const [preview, setPreview] = useState<PoseFrame>(EMPTY)
  const [people, setPeople] = useState(0)
  const [stats, setStats] = useState<SendStats>({ poseFps: 0, imageFps: 0, moving: false, portrait: false })
  const [edgeOk, setEdgeOk] = useState<boolean | null>(null)

  const release = useCallback(() => {
    sessionRef.current += 1
    cancelAnimationFrame(rafRef.current)
    cleanupRef.current()
    cleanupRef.current = () => undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    void wakeRef.current?.release().catch(() => undefined)
    wakeRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const stop = useCallback(() => {
    release()
    setPreview(EMPTY)
    setPeople(0)
    setStats({ poseFps: 0, imageFps: 0, moving: false, portrait: false })
    setEdgeOk(null)
    setStatus(isSupported() ? "idle" : "unsupported")
  }, [release])

  const start = useCallback(
    async (cam: Camera["id"], facing: "environment" | "user") => {
      if (!isSupported()) {
        setStatus("unsupported")
        return
      }
      // Must be the first thing after the tap, or iPhones refuse to ask.
      const motionAllowed = await askForMotion()
      release()
      const session = sessionRef.current
      const live = () => session === sessionRef.current
      setStatus("loading")

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!live()) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error("Video element missing")
        video.srcObject = stream
        await video.play()

        const [landmarker, offset] = await Promise.all([createLandmarker(EDGE_ASSETS), clockOffset()])
        if (!live()) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        // Keep the screen on: a phone that dims and locks stops being a camera.
        wakeRef.current = (await navigator.wakeLock?.request("screen").catch(() => null)) ?? null
        setStatus("running")

        const serverNow = () => Date.now() + offset
        // Counting from the start time means a reloaded page always counts higher.
        let seq = Date.now()
        let posesInFlight = 0
        let imageBusy = false
        let posesSent = 0
        let imagesSent = 0
        let movedAt = -Infinity

        const onMotion = (event: DeviceMotionEvent) => {
          const r = event.rotationRate
          const a = event.acceleration
          const turn = Math.hypot(r?.alpha ?? 0, r?.beta ?? 0, r?.gamma ?? 0)
          const shove = Math.hypot(a?.x ?? 0, a?.y ?? 0, a?.z ?? 0)
          if (turn > ROTATION_LIMIT || shove > ACCELERATION_LIMIT) movedAt = performance.now()
        }
        if (motionAllowed) window.addEventListener("devicemotion", onMotion)
        const moving = () => performance.now() - movedAt < MOVING_HOLD_MS

        const post = async (url: string, init: RequestInit) => {
          try {
            const response = await fetch(url, init)
            if (live()) setEdgeOk(response.ok)
            return response.ok
          } catch {
            if (live()) setEdgeOk(false)
            return false
          }
        }

        let lastVideoTime = -1
        let lastDetect = 0
        const detect = (now: number) => {
          if (!live()) return
          rafRef.current = requestAnimationFrame(detect)
          if (video.readyState < 2 || video.currentTime === lastVideoTime) return
          if (now - lastDetect < DETECT_EVERY_MS) return
          lastVideoTime = video.currentTime
          lastDetect = now
          const capturedAt = serverNow()
          const result = landmarker.detectForVideo(video, now)
          // Left person in the picture first, the order the edge server expects.
          const found = result.landmarks
            .map((landmarks) => toCoco17(landmarks).map((p): Keypoint => [p.x, p.y, p.visibility ?? 1]))
            .sort((p, q) => hipX(p) - hipX(q))
          const view = (person?: Keypoint[]) =>
            (person ?? []).map(([x, y]) => coverMap({ x, y }, video.videoWidth, video.videoHeight, false))
          setPreview({ a: view(found[0]), b: view(found[1]) })
          setPeople(found.length)

          if (posesInFlight >= POSES_IN_FLIGHT) return // the Wi-Fi is behind; skip this one
          posesInFlight += 1
          seq += 1
          void post(`/api/cameras/${cam}/pose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              people: found,
              width: video.videoWidth,
              height: video.videoHeight,
              seq,
              capturedAt,
              moving: moving(),
            }),
          }).then((ok) => {
            posesInFlight -= 1
            if (ok) posesSent += 1
          })
        }
        rafRef.current = requestAnimationFrame(detect)

        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        const imageTimer = window.setInterval(() => {
          if (imageBusy || !live() || video.videoWidth === 0 || !context) return
          imageBusy = true
          const scale = IMAGE_LONG_SIDE / Math.max(video.videoWidth, video.videoHeight)
          canvas.width = Math.round(video.videoWidth * scale)
          canvas.height = Math.round(video.videoHeight * scale)
          const capturedAt = serverNow()
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          // toBlob encodes off the main thread on most phones, unlike toDataURL.
          canvas.toBlob(
            (blob) => {
              if (!blob || !live()) {
                imageBusy = false
                return
              }
              void post(`/api/cameras/${cam}/image?capturedAt=${capturedAt}`, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: blob,
              }).then((ok) => {
                imageBusy = false
                if (ok) imagesSent += 1
              })
            },
            "image/jpeg",
            JPEG_QUALITY,
          )
        }, IMAGE_EVERY_MS)

        let windowStart = performance.now()
        const statsTimer = window.setInterval(() => {
          const now = performance.now()
          const seconds = (now - windowStart) / 1000
          setStats({
            poseFps: Math.round(posesSent / seconds),
            imageFps: Math.round(imagesSent / seconds),
            moving: moving(),
            portrait: video.videoHeight > video.videoWidth,
          })
          posesSent = 0
          imagesSent = 0
          windowStart = now
        }, 1000)

        cleanupRef.current = () => {
          window.clearInterval(imageTimer)
          window.clearInterval(statsTimer)
          window.removeEventListener("devicemotion", onMotion)
        }
      } catch (error) {
        if (!live()) return
        release()
        const name = error instanceof DOMException ? error.name : ""
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
      }
    },
    [release],
  )

  useEffect(() => release, [release])

  return { videoRef, status, preview, people, stats, edgeOk, start, stop }
}
