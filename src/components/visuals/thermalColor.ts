import { theme } from "../../styles/theme"

export function thermalColor(value: number, min = 33.4, max = 35.4): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  if (t < 0.5) return mix(theme.thermalCool, theme.thermalWarm, t / 0.5)
  return mix(theme.thermalWarm, theme.thermalHot, (t - 0.5) / 0.5)
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const c = pa.map((channel, index) => Math.round(channel + ((pb[index] ?? channel) - channel) * t))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}

function hex(value: string): number[] {
  const raw = value.replace("#", "")
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
}
