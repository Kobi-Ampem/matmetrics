import { BrowserRouter, Route, Routes } from "react-router-dom"
import { SettingsProvider } from "./state/SettingsContext"
import { LiveSessionProvider } from "./state/LiveSessionContext"
import { LandingPage } from "./features/landing/LandingPage"
import { DashboardPage } from "./features/dashboard/DashboardPage"
import { LivePage } from "./features/live/LivePage"
import { ReviewsListPage } from "./features/reviews/ReviewsListPage"
import { ReviewPage } from "./features/reviews/ReviewPage"
import { AthletesListPage } from "./features/athletes/AthletesListPage"
import { AthleteProfilePage } from "./features/athletes/AthleteProfilePage"
import { WarmupPage } from "./features/warmups/WarmupPage"
import { SystemPage } from "./features/system/SystemPage"
import { PrivacyPage } from "./features/privacy/PrivacyPage"
import { AthleteAppShowcase } from "./features/athleteApp/AthleteAppShowcase"
import { DebugPage, NotFoundPage } from "./features/debug/DebugPage"

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <LiveSessionProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/coach" element={<DashboardPage />} />
            <Route path="/coach/live" element={<LivePage />} />
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
        </LiveSessionProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
