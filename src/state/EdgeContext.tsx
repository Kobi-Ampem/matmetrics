import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { Camera, ConsentSettings, Flag, WarmupPlan, WarmupStep } from "../types"
import { cameraFeeds, type Keypoint } from "./cameraFeeds"

// The edge server (server/ in this repo) plays the club's local box. When the app is served by
// it, or VITE_EDGE_URL points at it, every screen shares one live clock and one set of
// settings. When it cannot be reached (for example on Vercel) the app runs on its own, as before.
const BASE = (import.meta.env.VITE_EDGE_URL as string | undefined)?.replace(/\/$/, "") ?? ""
const PROBE_TIMEOUT_MS = 1500
const RETRY_AFTER_DROP_MS = 3000
const RETRY_WHEN_ABSENT_MS = 30000

export type EdgeStatus = "probing" | "online" | "offline"

type ConsentPatch = Partial<Pick<ConsentSettings, "shareVitals" | "shareVideo" | "research" | "cloudBackup">>

export interface EdgeSettings {
  consents: Record<string, ConsentPatch>
  plans: Record<string, { status: WarmupPlan["status"]; steps: WarmupStep[]; notes: string[] }>
  notes: Record<string, { text: string; savedAt: string }>
  shared: Record<string, boolean>
  calibrationAt: string | null
  syncWaiting: boolean
}

export interface EdgeLive {
  elapsedSec: number
  running: boolean
  ended: boolean
  speed: 1 | 4 | 16
  seen: string[]
  epoch: number
  cameraMode: "simulated" | "real"
}

type Message =
  | { type: "hello"; settings: EdgeSettings; live: EdgeLive; alerts: Flag[] }
  | { type: "settings"; settings: EdgeSettings }
  | { type: "live"; live: EdgeLive }
  | { type: "alert"; alert: Flag }
  | {
      type: "frame"
      cam: Camera["id"]
      people: Keypoint[][]
      image: string | null
      width: number
      height: number
    }

interface EdgeApi {
  status: EdgeStatus
  settings: EdgeSettings | null
  live: EdgeLive | null
  // Alerts raised by the real camera phones, newest first.
  realAlerts: Flag[]
  send: (method: "POST" | "PUT" | "PATCH", path: string, body?: unknown) => void
  // Ask for (or stop) the camera video stream; only the coach's live page needs it.
  watchCameras: (on: boolean) => void
}

const EdgeContext = createContext<EdgeApi | null>(null)

function socketUrl(): string {
  const http = BASE || window.location.origin
  return `${http.replace(/^http/, "ws")}/ws`
}

async function probe(): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(`${BASE}/api/health`, { signal: controller.signal })
    // On a static host /api/health falls through to index.html, which is not JSON.
    const body = (await response.json()) as { status?: string }
    return response.ok && body.status === "ok"
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

export function EdgeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EdgeStatus>("probing")
  const [settings, setSettings] = useState<EdgeSettings | null>(null)
  const [live, setLive] = useState<EdgeLive | null>(null)
  const [realAlerts, setRealAlerts] = useState<Flag[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const watchingRef = useRef(false)
  const epochRef = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false
    let retry: number | undefined

    const schedule = (ms: number) => {
      if (!stopped) retry = window.setTimeout(connect, ms)
    }

    async function connect() {
      if (!(await probe()) || stopped) {
        setStatus("offline")
        schedule(RETRY_WHEN_ABSENT_MS)
        return
      }
      const socket = new WebSocket(socketUrl())
      socketRef.current = socket
      socket.onopen = () => {
        // After a reconnect, ask for camera video again if the live page still wants it.
        if (watchingRef.current) socket.send(JSON.stringify({ watchCameras: true }))
      }
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as Message
        if (message.type === "hello") {
          setSettings(message.settings)
          setLive(message.live)
          setRealAlerts(message.alerts)
          epochRef.current = message.live.epoch
          setStatus("online")
        } else if (message.type === "settings") {
          setSettings(message.settings)
        } else if (message.type === "live") {
          // A reset on the server clears its real alerts, so clear ours too.
          if (epochRef.current !== message.live.epoch) setRealAlerts([])
          epochRef.current = message.live.epoch
          setLive(message.live)
        } else if (message.type === "alert") {
          // The same fall seen by another camera comes again with the same id and one more camera.
          setRealAlerts((current) => [message.alert, ...current.filter((item) => item.id !== message.alert.id)])
        } else {
          const { cam, people, image, width, height } = message
          cameraFeeds.push(cam, { people, image, width, height })
        }
      }
      socket.onclose = () => {
        if (socketRef.current !== socket) return
        socketRef.current = null
        // Keep the last state on screen; the local simulation carries on from it.
        setStatus("offline")
        setLive(null)
        schedule(RETRY_AFTER_DROP_MS)
      }
    }

    void connect()
    return () => {
      stopped = true
      window.clearTimeout(retry)
      const socket = socketRef.current
      socketRef.current = null
      socket?.close()
    }
  }, [])

  const send = useCallback<EdgeApi["send"]>((method, path, body) => {
    void fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
      // The socket's close handler switches the app to local mode; nothing else to do here.
    })
  }, [])

  const watchCameras = useCallback((on: boolean) => {
    watchingRef.current = on
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ watchCameras: on }))
  }, [])

  const value = useMemo(
    () => ({ status, settings, live, realAlerts, send, watchCameras }),
    [status, settings, live, realAlerts, send, watchCameras],
  )
  return <EdgeContext.Provider value={value}>{children}</EdgeContext.Provider>
}

export function useEdge(): EdgeApi {
  const value = useContext(EdgeContext)
  if (!value) throw new Error("Edge missing")
  return value
}
