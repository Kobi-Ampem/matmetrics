import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import type { Camera, Flag } from "../types"
import { DEMO_SESSION_ID } from "../types"
import { athletes } from "../data/athletes"
import { participationFor } from "../data"
import {
  LIVE_START_SEC,
  OPENING_PAIRS,
  ROUND5_PAIRS,
  SESSION_LENGTH_SEC,
  flagsBefore,
  flagsBetween,
} from "../data/liveScript"
import { clamp } from "../utils/format"

export interface LivePair {
  id: string
  a: string
  b: string
  x: number
  y: number
}

interface Vitals {
  hr: number
  skinTemp: number
  load: number
  history: number[]
}

interface ActiveFlag {
  flagId: string
  cameras: Camera["id"][]
  untilMs: number
  athleteId: string
}

interface LiveState {
  sessionId: string
  elapsedSec: number
  running: boolean
  ended: boolean
  speed: 1 | 4 | 16
  pairs: LivePair[]
  vitals: Record<string, Vitals>
  alerts: Flag[]
  seen: Record<string, boolean>
  activeFlags: ActiveFlag[]
  pulsedPairs: { id: string; untilMs: number }[]
  latencyMs: number
}

type Action =
  | { type: "TICK"; now: number }
  | { type: "SET_SPEED"; speed: 1 | 4 | 16 }
  | { type: "TOGGLE_RUNNING" }
  | { type: "END" }
  | { type: "MARK_SEEN"; id: string }
  | { type: "RESET" }

function hrTarget(elapsedSec: number, resting: number, max: number): number {
  const minute = elapsedSec / 60
  const span = max - resting
  if (minute >= 80) return resting + span * Math.max(0.15, 0.45 - (minute - 80) / 30)
  if (minute < 15) return resting + span * 0.35
  if (minute < 40) return resting + span * 0.5
  const into = (minute - 40) % 8
  return into > 7 ? resting + span * 0.4 : resting + span * 0.74
}

function seedPairs(defs: { id: string; a: string; b: string }[]): LivePair[] {
  return defs.map((pair, index) => ({
    ...pair,
    x: 20 + (index % 4) * 18,
    y: 22 + Math.floor(index / 4) * 30,
  }))
}

function movePairs(defs: { id: string; a: string; b: string }[], prev: LivePair[], elapsed: number): LivePair[] {
  return defs.map((pair, index) => {
    const old = prev.find((item) => item.id === pair.id)
    const x0 = old?.x ?? 20 + (index % 4) * 18
    const y0 = old?.y ?? 22 + Math.floor(index / 4) * 30
    return {
      ...pair,
      x: clamp(x0 + Math.sin(elapsed / 8 + index) * 0.7, 12, 88),
      y: clamp(y0 + Math.cos(elapsed / 10 + index * 1.3) * 0.55, 12, 88),
    }
  })
}

function initialVitals(): Record<string, Vitals> {
  const map: Record<string, Vitals> = {}
  for (const athlete of athletes) {
    const participation = participationFor(DEMO_SESSION_ID, athlete.id)
    const hr =
      athlete.id === "a01"
        ? 168
        : Math.round(athlete.restingHr + 0.7 * (athlete.maxHr - athlete.restingHr))
    map[athlete.id] = {
      hr,
      skinTemp: Math.round((athlete.baselineSkinTemp + 0.8) * 10) / 10,
      load: participation?.load ?? 55,
      history: Array.from({ length: 120 }, (_, index) => Math.round(hr + Math.sin(index / 7) * 4)),
    }
  }
  return map
}

function createInitial(): LiveState {
  return {
    sessionId: DEMO_SESSION_ID,
    elapsedSec: LIVE_START_SEC,
    running: true,
    ended: false,
    speed: 1,
    pairs: seedPairs(OPENING_PAIRS),
    vitals: initialVitals(),
    alerts: flagsBefore(LIVE_START_SEC),
    seen: {},
    activeFlags: [],
    pulsedPairs: [],
    latencyMs: 1400,
  }
}

function stepVitals(state: LiveState, elapsed: number): Record<string, Vitals> {
  const onMat = new Set(state.pairs.flatMap((pair) => [pair.a, pair.b]))
  const next: Record<string, Vitals> = { ...state.vitals }
  for (const athlete of athletes) {
    const current = state.vitals[athlete.id]
    if (!current) continue
    if (!onMat.has(athlete.id)) {
      next[athlete.id] = current
      continue
    }
    let hr = current.hr
    const history = current.history.slice()
    for (let step = 0; step < state.speed; step += 1) {
      const target = hrTarget(elapsed, athlete.restingHr, athlete.maxHr)
      hr = hr + (target - hr) * 0.12 + Math.sin((elapsed + step) / 3 + athlete.age) * 0.9
      history.push(Math.round(hr))
    }
    next[athlete.id] = {
      hr: Math.round(clamp(hr, athlete.restingHr, athlete.maxHr)),
      skinTemp: Math.round((current.skinTemp + (athlete.baselineSkinTemp + 1.1 - current.skinTemp) * 0.02) * 10) / 10,
      load: current.load,
      history: history.slice(-120),
    }
  }
  return next
}

function reducer(state: LiveState, action: Action): LiveState {
  switch (action.type) {
    case "SET_SPEED":
      return { ...state, speed: action.speed }
    case "TOGGLE_RUNNING":
      return state.ended ? state : { ...state, running: !state.running }
    case "END":
      return { ...state, running: false, ended: true }
    case "MARK_SEEN":
      return { ...state, seen: { ...state.seen, [action.id]: true } }
    case "RESET":
      return createInitial()
    case "TICK": {
      if (!state.running || state.ended) return state
      const prev = state.elapsedSec
      const elapsed = Math.min(SESSION_LENGTH_SEC, prev + state.speed)
      const fresh = flagsBetween(prev, elapsed)
      const defs = elapsed >= 72 * 60 ? ROUND5_PAIRS : OPENING_PAIRS
      const pairs = movePairs(defs, state.pairs, elapsed)
      const activeFlags = state.activeFlags.filter((item) => item.untilMs > action.now)
      const pulsedPairs = state.pulsedPairs.filter((item) => item.untilMs > action.now)
      for (const flag of fresh) {
        if (flag.level !== "positive" && flag.cameras.length > 0) {
          activeFlags.push({
            flagId: flag.id,
            cameras: flag.cameras,
            untilMs: action.now + 6000,
            athleteId: flag.athleteId,
          })
        }
        const pair = pairs.find((item) => item.a === flag.athleteId || item.b === flag.athleteId)
        if (pair && flag.level !== "positive") {
          pulsedPairs.push({ id: pair.id, untilMs: action.now + 6000 })
        }
      }
      return {
        ...state,
        elapsedSec: elapsed,
        running: elapsed < SESSION_LENGTH_SEC,
        ended: elapsed >= SESSION_LENGTH_SEC ? true : state.ended,
        pairs,
        vitals: stepVitals({ ...state, pairs }, elapsed),
        alerts: [...fresh, ...state.alerts],
        activeFlags,
        pulsedPairs,
        latencyMs: 1100 + (elapsed * 17) % 700,
      }
    }
    default:
      return state
  }
}

const LiveContext = createContext<{ state: LiveState; dispatch: (action: Action) => void } | null>(null)

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitial)
  const location = useLocation()
  const liveRoute = location.pathname === "/coach/live" || location.pathname === "/coach"

  useEffect(() => {
    if (!liveRoute || !state.running || state.ended) return
    const id = window.setInterval(() => dispatch({ type: "TICK", now: Date.now() }), 1000)
    return () => window.clearInterval(id)
  }, [liveRoute, state.running, state.ended])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLiveSession() {
  const value = useContext(LiveContext)
  if (!value) throw new Error("Live session missing")
  return value
}

export function onMatIds(pairs: LivePair[]): Set<string> {
  return new Set(pairs.flatMap((pair) => [pair.a, pair.b]))
}
