import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ChevronDown, ChevronUp, Info, Minus, Plus } from "lucide-react"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Select } from "../../components/controls/Select"
import { Button } from "../../components/controls/Button"
import { StatusTag } from "../../components/data/StatusTag"
import { TimelineBar } from "../../components/charts/TimelineBar"
import { mockDb } from "../../data"
import { exercises, STANDARD_STEPS } from "../../data/exercises"
import { useSettings } from "../../state/SettingsContext"
import { formatDate } from "../../utils/format"
import type { WarmupStep } from "../../types"
import styles from "../common.module.css"

function nameOf(id: string): string {
  return exercises.find((item) => item.id === id)?.name ?? id
}

export function WarmupPage() {
  const { planFor, savePlan } = useSettings()
  const [params] = useSearchParams()
  const [athleteId, setAthleteId] = useState(() => {
    const requested = params.get("athlete")
    return requested && mockDb.athletes.some((item) => item.id === requested) ? requested : "a01"
  })
  const plan = planFor(athleteId)
  const [steps, setSteps] = useState<WarmupStep[]>(plan.steps)
  const [status, setStatus] = useState(plan.status)
  const [notes, setNotes] = useState(plan.notes)
  const planKey = `${athleteId}:${JSON.stringify(plan)}`
  const [syncedKey, setSyncedKey] = useState(planKey)
  if (syncedKey !== planKey) {
    setSyncedKey(planKey)
    setSteps(plan.steps)
    setStatus(plan.status)
    setNotes(plan.notes)
  }
  const total = steps.reduce((sum, step) => sum + step.minutes, 0)

  function persist(nextSteps: WarmupStep[], nextStatus: typeof status, nextNotes: string[]) {
    setSteps(nextSteps)
    setStatus(nextStatus)
    setNotes(nextNotes)
    savePlan({ athleteId, date: "2026-11-19", steps: nextSteps, notes: nextNotes, status: nextStatus })
  }

  function move(index: number, dir: number) {
    const swap = index + dir
    if (swap < 0 || swap >= steps.length) return
    const next = steps.slice()
    const current = next[index]
    const other = next[swap]
    if (!current || !other) return
    next[index] = other
    next[swap] = current
    setSteps(next)
  }

  function bump(index: number, delta: number) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, minutes: Math.max(1, step.minutes + delta) } : step,
      ),
    )
  }

  const athlete = mockDb.athletes.find((item) => item.id === athleteId)

  return (
    <AppShell>
      <TopBar
        title="Warm-up plan"
        breadcrumb={`Next session · ${formatDate("2026-11-19")}`}
        actions={
          <Select
            inline
            label="Athlete"
            value={athleteId}
            onChange={setAthleteId}
            options={mockDb.athletes.map((item) => ({ value: item.id, label: item.name }))}
          />
        }
      />
      <div className="page stack-lg">
        <div className="split" style={{ ["--split" as string]: "minmax(0, 1.6fr) minmax(280px, 0.9fr)" }}>
          <section className="pane stack">
            <div className={styles.toolbar}>
              <div>
                <div className={styles.filters} style={{ alignItems: "center", marginBottom: 12 }}>
                  <StatusTag level={status === "approved" ? "ok" : "neutral"}>{status}</StatusTag>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {status === "suggested"
                      ? "Suggested from the last session. The coach approves before the athlete sees it as final."
                      : status === "approved"
                        ? `Approved. ${athlete?.name.split(" ")[0] ?? "The athlete"} sees this plan as final.`
                        : "Standard club plan."}
                  </span>
                </div>
                <div className={styles.total}>
                  <span className="num">{total}</span>
                  <span>min · standard plan is 15 min</span>
                </div>
              </div>
            </div>
            <TimelineBar steps={steps.map((step) => ({ name: nameOf(step.exerciseId), minutes: step.minutes, added: step.change !== "standard" }))} />
            <div className={styles.list}>
              {steps.map((step, index) => (
                <div key={`${step.exerciseId}-${index}`} className={`${styles.step} ${step.change !== "standard" ? styles.added : ""}`}>
                  <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className={styles.stepTitle}>
                      <b>{nameOf(step.exerciseId)}</b>
                      {step.change !== "standard" ? <StatusTag level="neutral">{step.change}</StatusTag> : null}
                    </span>
                    <small>{step.reason}</small>
                  </span>
                  <span className={styles.mins}>
                    <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ChevronUp size={16} strokeWidth={1.5} />
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={index === steps.length - 1} onClick={() => move(index, 1)}>
                      <ChevronDown size={16} strokeWidth={1.5} />
                    </button>
                    <span className={styles.divider} />
                    <button type="button" className={styles.iconBtn} aria-label="Shorten" disabled={step.minutes <= 1} onClick={() => bump(index, -1)}>
                      <Minus size={16} strokeWidth={1.5} />
                    </button>
                    <span className="num">{step.minutes} min</span>
                    <button type="button" className={styles.iconBtn} aria-label="Lengthen" onClick={() => bump(index, 1)}>
                      <Plus size={16} strokeWidth={1.5} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <aside className="pane">
            <div className="section-head">
              <h2 className="section-title">Why this plan</h2>
            </div>
            <div className={styles.reasons}>
              {notes.length === 0 ? <p className={styles.reason}>No adjustments. This is the standard plan.</p> : null}
              {notes.map((note) => (
                <p key={note} className={styles.reason}>
                  <Info size={16} strokeWidth={1.75} />
                  <span>{note}</span>
                </p>
              ))}
            </div>
          </aside>
        </div>
        <div className={styles.actionsBar}>
          <Button icon={status === "approved" ? <Check size={16} strokeWidth={2} /> : undefined} onClick={() => persist(steps, "approved", notes)}>
            {status === "approved" ? "Approved" : "Approve plan"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const base = mockDb.warmups.find((item) => item.athleteId === athleteId)
              if (!base) return
              persist(base.steps, "suggested", base.notes)
            }}
          >
            Reset to suggestion
          </Button>
          <Button variant="text" onClick={() => persist(STANDARD_STEPS.map((step) => ({ ...step })), "standard", ["Standard plan"])}>
            Use standard plan
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
