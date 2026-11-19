import { useMemo } from "react"
import { mockDb } from "../data"

export function useMockDb() {
  return useMemo(() => mockDb, [])
}
