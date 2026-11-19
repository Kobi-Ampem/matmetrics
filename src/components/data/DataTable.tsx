import { useMemo, useState, type ReactNode } from "react"
import clsx from "clsx"
import { ArrowDown, ArrowUp } from "lucide-react"
import styles from "./DataTable.module.css"

export interface Column<T> {
  id: string
  header: string
  numeric?: boolean
  sortValue?: (row: T) => string | number
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  sortable = true,
  onRowClick,
  dense,
  rowKey,
  initialSort,
}: {
  columns: Column<T>[]
  rows: T[]
  sortable?: boolean
  onRowClick?: (row: T) => void
  dense?: boolean
  rowKey: (row: T) => string
  initialSort?: { id: string; dir: "asc" | "desc" }
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((item) => item.id === sort.id)
    if (!column?.sortValue) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = column.sortValue?.(a)
      const bv = column.sortValue?.(b)
      if (av == null || bv == null) return 0
      const base = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === "asc" ? base : -base
    })
    return copy
  }, [rows, sort, columns])

  function toggle(id: string) {
    const column = columns.find((item) => item.id === id)
    if (!sortable || !column?.sortValue) return
    setSort((current) => {
      if (!current || current.id !== id) return { id, dir: "asc" }
      return { id, dir: current.dir === "asc" ? "desc" : "asc" }
    })
  }

  return (
    <div className={styles.scroll}>
      <table className={clsx(styles.table, dense && styles.dense)}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={sort?.id === column.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                className={clsx(column.numeric && styles.num, column.sortValue && sortable && styles.sortable, sort?.id === column.id && styles.sorted)}
              >
                <button type="button" onClick={() => toggle(column.id)} disabled={!column.sortValue || !sortable}>
                  {column.header}
                  {column.sortValue && sortable && column.header ? (
                    sort?.id === column.id && sort.dir === "desc" ? (
                      <ArrowDown className={styles.arrow} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <ArrowUp className={styles.arrow} strokeWidth={2} aria-hidden="true" />
                    )
                  ) : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                No rows match these filters.
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? styles.click : undefined}>
                {columns.map((column) => (
                  <td key={column.id} className={column.numeric ? styles.num : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
