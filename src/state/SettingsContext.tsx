import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { ConsentSettings, WarmupPlan, WarmupStep } from "../types"
import { mockDb } from "../data"

const KEY = "matmetrics-demo-v1"

interface PlanEdit {
  status: WarmupPlan["status"]
  steps: WarmupStep[]
  notes: string[]
}

interface Note {
  text: string
  savedAt: string
}

interface Persisted {
  consents: ConsentSettings[]
  plans: Record<string, PlanEdit>
  notes: Record<string, Note>
  shared: Record<string, boolean>
  calibrationAt?: string
  syncWaiting: boolean
}

interface SettingsApi {
  consents: ConsentSettings[]
  consentFor: (athleteId: string) => ConsentSettings | undefined
  updateConsent: (athleteId: string, patch: Partial<ConsentSettings>) => void
  planFor: (athleteId: string) => WarmupPlan
  savePlan: (plan: WarmupPlan) => void
  noteFor: (key: string) => Note | undefined
  saveNote: (key: string, text: string) => void
  isShared: (key: string) => boolean
  setShared: (key: string, value: boolean) => void
  calibrationAt?: string
  setCalibrationNow: () => void
  syncWaiting: boolean
  requestSync: () => void
  resetDemo: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

function blank(): Persisted {
  return {
    consents: mockDb.consents.map((item) => ({ ...item })),
    plans: {},
    notes: {},
    shared: {},
    syncWaiting: false,
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blank()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      ...blank(),
      ...parsed,
      consents: parsed.consents?.length ? parsed.consents : blank().consents,
      plans: parsed.plans ?? {},
      notes: parsed.notes ?? {},
      shared: parsed.shared ?? {},
      syncWaiting: Boolean(parsed.syncWaiting),
    }
  } catch {
    return blank()
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load())

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const api = useMemo<SettingsApi>(() => {
    return {
      consents: state.consents,
      consentFor: (athleteId) => state.consents.find((item) => item.athleteId === athleteId),
      updateConsent: (athleteId, patch) => {
        setState((current) => ({
          ...current,
          consents: current.consents.map((item) => (item.athleteId === athleteId ? { ...item, ...patch } : item)),
        }))
      },
      planFor: (athleteId) => {
        const base = mockDb.warmups.find((plan) => plan.athleteId === athleteId)
        const saved = state.plans[athleteId]
        if (!base) {
          return { athleteId, date: "2026-11-19", steps: [], notes: [], status: "standard" }
        }
        if (!saved) return base
        return { ...base, status: saved.status, steps: saved.steps, notes: saved.notes }
      },
      savePlan: (plan) => {
        setState((current) => ({
          ...current,
          plans: {
            ...current.plans,
            [plan.athleteId]: { status: plan.status, steps: plan.steps, notes: plan.notes },
          },
        }))
      },
      noteFor: (key) => state.notes[key],
      saveNote: (key, text) => {
        const now = new Date()
        const savedAt = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
        setState((current) => ({ ...current, notes: { ...current.notes, [key]: { text, savedAt } } }))
      },
      isShared: (key) => Boolean(state.shared[key]),
      setShared: (key, value) => {
        setState((current) => ({ ...current, shared: { ...current.shared, [key]: value } }))
      },
      calibrationAt: state.calibrationAt,
      setCalibrationNow: () => {
        const now = new Date()
        const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
        setState((current) => ({ ...current, calibrationAt: stamp }))
      },
      syncWaiting: state.syncWaiting,
      requestSync: () => setState((current) => ({ ...current, syncWaiting: true })),
      resetDemo: () => {
        localStorage.removeItem(KEY)
        setState(blank())
      },
    }
  }, [state])

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const value = useContext(SettingsContext)
  if (!value) throw new Error("Settings missing")
  return value
}
