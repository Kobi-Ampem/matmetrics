import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import clsx from "clsx"
import styles from "./Button.module.css"

type Variant = "primary" | "secondary" | "text" | "danger"

interface Props {
  variant?: Variant
  icon?: ReactNode
  children: ReactNode
  to?: string
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export function Button({ variant = "primary", icon, children, to, type = "button", onClick, disabled, ariaLabel }: Props) {
  const className = clsx(styles.btn, styles[variant])
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={className} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {content}
    </button>
  )
}
