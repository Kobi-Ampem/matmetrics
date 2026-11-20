import { useCallback, useEffect, useRef, useState } from "react"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"
import type { Camera, PoseFrame } from "../../types"
import type { Keypoint } from "../../state/cameraFeeds"
import { createLandmarker, EDGE_ASSETS, type CameraStatus } from "../camera/usePoseCamera"
import { coverMap, toCoco17 } from "../camera/poseMapping"

// About six frames a second: enough for the fall rules (they look at the last second), light
// enough for four phones on one Wi-Fi.
const SEND_EVERY_MS = 160
const IMAGE_WIDTH = 480
const JPEG_QUALITY = 0.55
// Pose detection at the full video rate (30 fps) starves the sender on a phone; the fall rules
// only need a few samples a second.
const DETECT_EVERY_MS = 100
const EMPTY: PoseFrame = { a: [], b: [] }

function isSupported() {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
}

function hipX(person: Keypoint[]): number {
  return ((person[11]?.[0] ?? 0.5) + (person[12]?.[0] ?? 0.5)) / 2
}

/**
 * Turns this phone into one of the four mat cameras: runs pose detection on the phone and
 * sends keypoints plus a small picture to the edge server several times a second.
 */
export function useCameraNode() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const wakeRef = useRef<WakeLockSentinel | null>(null)
  const peopleRef = useRef<Keypoint[][]>([])
  const rafRef = useRef(0)
  const senderRef = useRef(0)
  const sessionRef = useRef(0)

  const [status, setStatus] = useState<CameraStatus>(() => (isSupported() ? "idle" : "unsupported"))
  const [preview, setPreview] = useState<PoseFrame>(EMPTY)
  const [people, setPeople] = useState(0)
  const [sentFps, setSentFps] = useState(0)
  const [edgeOk, setEdgeOk] = useState<boolean | null>(null)

  const release = useCallback(() => {
    sessionRef.current += 1
    cancelAnimationFrame(rafRef.current)
    window.clearInterval(senderRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    void wakeRef.current?.release().catch(() => undefined)
    wakeRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    peopleRef.current = []
  }, [])

  const stop = useCallback(() => {
    release()
    setPreview(EMPTY)
    setPeople(0)
    setSentFps(0)
    setEdgeOk(null)
    setStatus(isSupported() ? "idle" : "unsupported")
  }, [release])

  const start = useCallback(
    async (cam: Camera["id"], facing: "environment" | "user") => {
      if (!isSupported()) {
        setStatus("unsupported")
        return
      }
      release()
      const session = sessionRef.current
      setStatus("loading")

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error("Video element missing")
        video.srcObject = stream
        await video.play()

        const landmarker = await createLandmarker(EDGE_ASSETS)
        if (session !== sessionRef.current) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        // Keep the screen on: a phone that dims and locks stops being a camera.
        wakeRef.current = (await navigator.wakeLock?.request("screen").catch(() => null)) ?? null
        setStatus("running")

        let lastVideoTime = -1
        let lastDetect = 0
        const detect = (now: number) => {
          if (session !== sessionRef.current) return
          rafRef.current = requestAnimationFrame(detect)
          if (video.readyState < 2 || video.currentTime === lastVideoTime) return
          if (now - lastDetect < DETECT_EVERY_MS) return
          lastVideoTime = video.currentTime
          lastDetect = now
          const result = landmarker.detectForVideo(video, now)
          // Left person in the picture first, the order the edge server expects.
          const found = result.landmarks
            .map((landmarks) => toCoco17(landmarks).map((p): Keypoint => [p.x, p.y, p.visibility ?? 1]))
            .sort((p, q) => hipX(p) - hipX(q))
          peopleRef.current = found
          const view = (person?: Keypoint[]) =>
            (person ?? []).map(([x, y]) => coverMap({ x, y }, video.videoWidth, video.videoHeight, false))
          setPreview({ a: view(found[0]), b: view(found[1]) })
          setPeople(found.length)
        }
        rafRef.current = requestAnimationFrame(detect)

        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        let busy = false
        let sent = 0
        let windowStart = performance.now()
        senderRef.current = window.setInterval(async () => {
          // Skip a beat rather than queue requests when the Wi-Fi is slow.
          if (busy || session !== sessionRef.current || video.videoWidth === 0) return
          busy = true
          canvas.width = IMAGE_WIDTH
          canvas.height = Math.round((IMAGE_WIDTH * video.videoHeight) / video.videoWidth)
          context?.drawImage(video, 0, 0, canvas.width, canvas.height)
          try {
            const response = await fetch(`/api/cameras/${cam}/frame`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                people: peopleRef.current,
                image: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
                width: video.videoWidth,
                height: video.videoHeight,
              }),
            })
            if (session === sessionRef.current) setEdgeOk(response.ok)
            if (response.ok) sent += 1
          } catch {
            if (session === sessionRef.current) setEdgeOk(false)
          } finally {
            busy = false
          }
          const now = performance.now()
          if (now - windowStart >= 1000) {
            if (session === sessionRef.current) setSentFps(Math.round((sent * 1000) / (now - windowStart)))
            sent = 0
            windowStart = now
          }
        }, SEND_EVERY_MS)
      } catch (error) {
        if (session !== sessionRef.current) return
        release()
        const name = error instanceof DOMException ? error.name : ""
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
      }
    },
    [release],
  )

  useEffect(() => release, [release])

  return { videoRef, status, preview, people, sentFps, edgeOk, start, stop }
}
