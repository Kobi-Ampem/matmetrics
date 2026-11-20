import { useCallback, useEffect, useRef, useState } from "react"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"
import type { PoseFrame } from "../../types"
import { assignPeople, mapPose, smooth } from "./poseMapping"

export type CameraStatus = "idle" | "loading" | "running" | "denied" | "unsupported" | "error"

// Must match the installed @mediapipe/tasks-vision version, or the WASM and JS glue disagree.
const TASKS_VISION_VERSION = "1.2.3"
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
const SMOOTHING = 0.5
const EMPTY: PoseFrame = { a: [], b: [] }

function isSupported() {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
}

async function createLandmarker(): Promise<PoseLandmarker> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision")
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  const build = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numPoses: 2,
    })
  try {
    return await build("GPU")
  } catch {
    return build("CPU")
  }
}

export function usePoseCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef(0)
  const sessionRef = useRef(0)
  const frameRef = useRef<PoseFrame>(EMPTY)

  const [status, setStatus] = useState<CameraStatus>(() => (isSupported() ? "idle" : "unsupported"))
  const [frame, setFrame] = useState<PoseFrame>(EMPTY)
  const [people, setPeople] = useState(0)
  const [fps, setFps] = useState(0)

  const release = useCallback(() => {
    sessionRef.current += 1
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    frameRef.current = EMPTY
  }, [])

  const stop = useCallback(() => {
    release()
    setFrame(EMPTY)
    setPeople(0)
    setFps(0)
    setStatus(isSupported() ? "idle" : "unsupported")
  }, [release])

  const start = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported")
      return
    }
    release()
    const session = sessionRef.current
    setStatus("loading")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
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

      const landmarker = await createLandmarker()
      if (session !== sessionRef.current) {
        landmarker.close()
        return
      }
      landmarkerRef.current = landmarker
      setStatus("running")

      let lastVideoTime = -1
      let windowStart = performance.now()
      let windowFrames = 0

      const tick = () => {
        if (session !== sessionRef.current) return
        rafRef.current = requestAnimationFrame(tick)
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime

        const now = performance.now()
        const result = landmarker.detectForVideo(video, now)
        const poses = result.landmarks.map((landmarks) =>
          mapPose(landmarks, video.videoWidth, video.videoHeight, true),
        )
        const { a, b } = assignPeople(poses, frameRef.current)
        const next = {
          a: smooth(frameRef.current.a, a, SMOOTHING),
          b: smooth(frameRef.current.b, b, SMOOTHING),
        }
        frameRef.current = next
        setFrame(next)
        setPeople(poses.length)

        windowFrames += 1
        if (now - windowStart >= 1000) {
          setFps(Math.round((windowFrames * 1000) / (now - windowStart)))
          windowStart = now
          windowFrames = 0
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (error) {
      if (session !== sessionRef.current) return
      release()
      const name = error instanceof DOMException ? error.name : ""
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
    }
  }, [release])

  useEffect(() => release, [release])

  return { videoRef, status, frame, people, fps, start, stop }
}
