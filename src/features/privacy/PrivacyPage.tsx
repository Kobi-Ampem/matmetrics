import { useState } from "react"
import { Check, Lock } from "lucide-react"
import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { Select } from "../../components/controls/Select"
import { Toggle } from "../../components/controls/Toggle"
import { Button } from "../../components/controls/Button"
import { Modal } from "../../components/controls/Modal"
import { mockDb } from "../../data"
import { useSettings } from "../../state/SettingsContext"
import { formatDate } from "../../utils/format"
import styles from "../common.module.css"

export function PrivacyPage() {
  const { consentFor } = useSettings()
  const [athleteId, setAthleteId] = useState("a01")
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState("")
  const consent = consentFor(athleteId)
  const athlete = mockDb.athletes.find((item) => item.id === athleteId)

  return (
    <AppShell>
      <TopBar
        title="Your data, your choice"
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
      <div className={`page stack-lg ${styles.narrow}`}>
        <p className={styles.lead}>
          MatMetrics only records during sessions. Video and health data stay on your club's device unless you choose to share them.
        </p>
        <section>
          <div className="section-head">
            <h2 className="section-title">{athlete?.name ?? "Athlete"}'s choices</h2>
            <small style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Lock size={12} strokeWidth={2} />
              Read-only for the coach
            </small>
          </div>
          {consent ? (
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Toggle label="Share heart rate and temperature with coach" checked={consent.shareVitals} disabled onChange={() => undefined} />
              <Toggle label="Share session videos with coach" checked={consent.shareVideo} disabled onChange={() => undefined} />
              <Toggle label="Include anonymised data in research" checked={consent.research} disabled onChange={() => undefined} />
              <Toggle label="Back up to cloud when online" checked={consent.cloudBackup} disabled onChange={() => undefined} />
            </div>
          ) : null}
          {consent ? (
            <p className={styles.sub} style={{ marginTop: 12 }}>
              Consent given {formatDate(consent.consentDate)}
              {athlete && athlete.age < 18 ? " · Parent consent given 4 Sep 2026" : ""}
              {" · "}Edits are made in the athlete app
            </p>
          ) : null}
        </section>
        <section className={styles.banner}>
          <div>
            <p className={styles.danger} style={{ fontFamily: "var(--font-ui)", fontSize: 15 }}>Delete all my data</p>
            <p>Removes this athlete's videos, vitals and reviews from the club device.</p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>Delete all my data</Button>
        </section>
        {toast ? <p className={styles.toast}><Check size={14} strokeWidth={2} />{toast}</p> : null}
      </div>
      <Modal open={open} title="Delete all data" onClose={() => setOpen(false)}>
        <p>This demo records the request and does not delete anything.</p>
        <div className={styles.filters}>
          <Button
            variant="danger"
            onClick={() => {
              setOpen(false)
              setToast("Request recorded (demo)")
            }}
          >
            Confirm
          </Button>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </AppShell>
  )
}
