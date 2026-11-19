import { Link, NavLink } from "react-router-dom"
import { Cpu, Dumbbell, Film, LayoutDashboard, Radio, Shield, Users } from "lucide-react"
import clsx from "clsx"
import { useSettings } from "../../state/SettingsContext"
import { useLiveSession } from "../../state/LiveSessionContext"
import { NetworkStatus } from "./NetworkStatus"
import styles from "./Sidebar.module.css"

const NAV = [
  { to: "/coach", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coach/live", label: "Live session", icon: Radio, end: false },
  { to: "/coach/reviews", label: "Reviews", icon: Film, end: false },
  { to: "/coach/athletes", label: "Athletes", icon: Users, end: false },
  { to: "/coach/warmups", label: "Warm-ups", icon: Dumbbell, end: false },
]

const CLUB = [
  { to: "/coach/system", label: "System", icon: Cpu, end: false },
  { to: "/coach/privacy", label: "Privacy", icon: Shield, end: false },
]

export function Sidebar() {
  const { resetDemo } = useSettings()
  const { state } = useLiveSession()

  function renderLinks(items: typeof NAV) {
    return items.map((item) => {
      const Icon = item.icon
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
          title={item.label}
        >
          <Icon size={18} strokeWidth={1.5} />
          <span>{item.label}</span>
          {item.to === "/coach/live" && !state.ended ? <i className={styles.live} aria-hidden="true" /> : null}
        </NavLink>
      )
    })
  }

  return (
    <aside className={clsx(styles.side, "no-print")}>
      <Link to="/" className={styles.brand}>
        <span className={styles.mark}>M</span>
        <span className={styles.word}>MatMetrics</span>
      </Link>
      <div className={styles.group}>Coach</div>
      <nav aria-label="Coach" className={styles.nav}>
        {renderLinks(NAV)}
      </nav>
      <div className={styles.group}>Club</div>
      <nav aria-label="Club" className={styles.nav}>
        {renderLinks(CLUB)}
      </nav>
      <div className={styles.foot}>
        <div className={styles.coach}>
          <span className={styles.avatar}>DT</span>
          <span>
            <strong>David Thompson</strong>
            <em>Head coach</em>
          </span>
        </div>
        <NetworkStatus />
        <button type="button" className={styles.reset} onClick={resetDemo}>
          Reset demo
        </button>
      </div>
    </aside>
  )
}
