import { AppShell } from "../../components/layout/AppShell"
import { TopBar } from "../../components/layout/TopBar"
import { ReviewsTable } from "./ReviewsTable"

export function ReviewsListPage() {
  return (
    <AppShell>
      <TopBar title="Reviews" />
      <div className="page">
        <ReviewsTable />
      </div>
    </AppShell>
  )
}
