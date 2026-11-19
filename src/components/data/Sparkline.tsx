import { theme } from "../../styles/theme"

export function Sparkline({ values, tone = "neutral" }: { values: number[]; tone?: "neutral" | "risk" | "ok" | "accent" | "light" }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = 80 / (values.length - 1)
  const d = values
    .map((value, index) => {
      const x = index * step
      const y = 22 - ((value - min) / span) * 18
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
  const color =
    tone === "risk" ? theme.riskMed : tone === "ok" ? theme.ok : tone === "accent" ? theme.accent : tone === "light" ? theme.nightInk : theme.ink2
  return (
    <svg className="spark" width="80" height="24" viewBox="0 0 80 24" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}
