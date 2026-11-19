import clsx from "clsx"
import type { RiskLevel } from "../../types"
import styles from "./StatusTag.module.css"

type Level = RiskLevel | "positive" | "ok" | "neutral"

const LABEL: Record<Level, string> = {
  high: "High",
  med: "Med",
  low: "Low",
  positive: "Positive",
  ok: "Ok",
  neutral: "Neutral",
}

export function StatusTag({ level, children }: { level: Level; children?: string }) {
  return <span className={clsx(styles.tag, styles[level])}>{children ?? LABEL[level]}</span>
}
