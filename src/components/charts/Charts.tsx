import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { theme } from "../../styles/theme"
import { formatVideoTime } from "../../utils/format"
import styles from "./Charts.module.css"

export interface Point {
  label: string
  value: number
  name?: string
}

function Tip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: { value?: number | string; payload?: { name?: string } }[]
  label?: string | number
  unit?: string
}) {
  if (!active || !payload?.length) return null
  const shown = payload[0]?.payload?.name ?? (typeof label === "number" ? formatVideoTime(label) : label)
  return (
    <div className={styles.tip}>
      <div className={styles.tipLabel}>{shown}</div>
      <div className={styles.tipValue}>
        {payload[0]?.value}
        {unit ? <span> {unit}</span> : null}
      </div>
    </div>
  )
}

const axis = {
  stroke: theme.ink3,
  fontSize: 11,
  fontFamily: theme.fontData,
  tickLine: false,
  axisLine: false,
}

const cursor = { stroke: theme.lineStrong, strokeWidth: 1 }

export function LineChartPanel({
  data,
  color = theme.accent,
  height = 220,
  endLabel,
  unit,
}: {
  data: Point[]
  color?: string
  height?: number
  endLabel?: string
  unit?: string
}) {
  const lastIndex = data.length - 1
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: endLabel ? 44 : 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.line} vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={16} />
          <YAxis {...axis} width={36} />
          <Tooltip content={<Tip unit={unit} />} cursor={cursor} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: color, stroke: theme.surface, strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props
              if (index !== lastIndex || cx == null || cy == null) return <g key={`d-${index}`} />
              return (
                <g key={`d-${index}`}>
                  <circle cx={cx} cy={cy} r={4} fill={color} stroke={theme.surface} strokeWidth={2} />
                  {endLabel ? (
                    <text x={cx + 8} y={cy + 4} fill={color} fontSize={12} fontFamily={theme.fontData} fontWeight={500}>
                      {endLabel}
                    </text>
                  ) : null}
                </g>
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChartPanel({
  data,
  horizontal,
  height = 260,
  hotAbove,
  unit,
}: {
  data: Point[]
  horizontal?: boolean
  height?: number
  hotAbove?: number
  unit?: string
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 24, right: 12, left: 0, bottom: 0 }} barCategoryGap={horizontal ? "28%" : "24%"}>
          <CartesianGrid stroke={theme.line} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" {...axis} allowDecimals={false} />
              <YAxis type="category" dataKey="label" {...axis} width={96} tick={{ fill: theme.ink2, fontSize: 12, fontFamily: theme.fontUi }} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" {...axis} interval={0} tick={{ fill: theme.ink2, fontSize: 11, fontFamily: theme.fontUi }} height={28} />
              <YAxis {...axis} width={32} />
            </>
          )}
          <Tooltip content={<Tip unit={unit} />} cursor={{ fill: theme.bg }} isAnimationActive={false} />
          <Bar dataKey="value" maxBarSize={horizontal ? 14 : 28} radius={horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={hotAbove != null && entry.value > hotAbove ? theme.riskMed : theme.ink} />
            ))}
          </Bar>
          {hotAbove != null && !horizontal ? (
            <ReferenceLine y={hotAbove} stroke={theme.riskMed} strokeDasharray="4 4" label={{ value: `High load ${hotAbove}`, fill: theme.riskMed, fontSize: 11, fontFamily: theme.fontData, position: "top", offset: 6 }} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HeartChart({
  data,
  flagSeconds,
  height = 240,
}: {
  data: { t: number; hr: number }[]
  flagSeconds: number[]
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.line} vertical={false} />
          <XAxis dataKey="t" type="number" domain={[0, 5400]} ticks={[0, 900, 1800, 2700, 3600, 4500, 5400]} {...axis} tickFormatter={(value) => formatVideoTime(Number(value))} />
          <YAxis {...axis} width={36} domain={[50, 210]} ticks={[60, 100, 140, 180]} />
          <Tooltip content={<Tip unit="bpm" />} cursor={cursor} isAnimationActive={false} />
          <ReferenceArea y1={170} y2={210} fill={theme.riskMed} fillOpacity={0.06} />
          <ReferenceLine y={170} stroke={theme.riskMed} strokeDasharray="4 4" label={{ value: "High effort", fill: theme.riskMed, fontSize: 11, fontFamily: theme.fontData, position: "insideTopLeft" }} />
          {flagSeconds.map((second) => (
            <ReferenceLine key={second} x={second} stroke={theme.riskHigh} strokeOpacity={0.5} />
          ))}
          <Area type="monotone" dataKey="hr" stroke={theme.accent} strokeWidth={1.5} fill={theme.accent} fillOpacity={0.08} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
