import { lazy, Suspense, type ComponentType } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { EdgeProvider } from "./state/EdgeContext"
import { SettingsProvider } from "./state/SettingsContext"
import { LiveSessionProvider } from "./state/LiveSessionContext"
import { LandingPage } from "./features/landing/LandingPage"

// Each page loads its own code when first opened, so the landing page does not wait for the
// charts library and the camera code. Pages use named exports, hence the small adapter.
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const DashboardPage = page(() => import("./features/dashboard/DashboardPage"), "DashboardPage")
const LivePage = page(() => import("./features/live/LivePage"), "LivePage")
const CameraPage = lazy(() => import("./features/camera/CameraPage"))
const CameraNodePage = page(() => import("./features/cameraNode/CameraNodePage"), "CameraNodePage")
const ReviewsListPage = page(() => import("./features/reviews/ReviewsListPage"), "ReviewsListPage")
const ReviewPage = page(() => import("./features/reviews/ReviewPage"), "ReviewPage")
const AthletesListPage = page(() => import("./features/athletes/AthletesListPage"), "AthletesListPage")
const AthleteProfilePage = page(() => import("./features/athletes/AthleteProfilePage"), "AthleteProfilePage")
const WarmupPage = page(() => import("./features/warmups/WarmupPage"), "WarmupPage")
const SystemPage = page(() => import("./features/system/SystemPage"), "SystemPage")
const PrivacyPage = page(() => import("./features/privacy/PrivacyPage"), "PrivacyPage")
const AthleteAppShowcase = page(() => import("./features/athleteApp/AthleteAppShowcase"), "AthleteAppShowcase")
const DebugPage = page(() => import("./features/debug/DebugPage"), "DebugPage")
const NotFoundPage = page(() => import("./features/debug/DebugPage"), "NotFoundPage")

export default function App() {
  return (
    <BrowserRouter>
      <EdgeProvider>
        <SettingsProvider>
          <LiveSessionProvider>
            <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/coach" element={<DashboardPage />} />
                <Route path="/coach/live" element={<LivePage />} />
                <Route path="/coach/camera" element={<CameraPage />} />
                <Route path="/camera" element={<CameraNodePage />} />
                <Route path="/coach/reviews" element={<ReviewsListPage />} />
                <Route path="/coach/reviews/:sessionId/:athleteId" element={<ReviewPage />} />
                <Route path="/coach/athletes" element={<AthletesListPage />} />
                <Route path="/coach/athletes/:athleteId" element={<AthleteProfilePage />} />
                <Route path="/coach/warmups" element={<WarmupPage />} />
                <Route path="/coach/system" element={<SystemPage />} />
                <Route path="/coach/privacy" element={<PrivacyPage />} />
                <Route path="/athlete" element={<AthleteAppShowcase />} />
                <Route path="/debug" element={<DebugPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </LiveSessionProvider>
        </SettingsProvider>
      </EdgeProvider>
    </BrowserRouter>
  )
}
