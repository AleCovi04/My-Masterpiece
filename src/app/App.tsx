import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import AnalysisPage from '../features/analysis/AnalysisPage'
import CalendarPage from '../features/calendar/CalendarPage'
import DataPage from '../features/data/DataPage'
import PlannerPage from '../features/planner/PlannerPage'
import OverviewPage from '../features/overview/OverviewPage'
import PlanPage from '../features/plan/PlanPage'
import AppShell from './AppShell'
import { ThemeProvider } from './ThemeProvider'

// caricata solo quando serve (in palestra)
const LivePage = lazy(() => import('../features/live/LivePage'))

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="piano" element={<PlanPage />} />
              <Route path="forger" element={<PlannerPage />} />
              {/* vecchio indirizzo del Forger */}
              <Route
                path="planner"
                element={<Navigate to="/forger" replace />}
              />
              <Route path="analisi" element={<AnalysisPage />} />
              <Route path="dati" element={<DataPage />} />
              <Route
                path="allenamento"
                element={
                  <Suspense fallback={null}>
                    <LivePage />
                  </Suspense>
                }
              />
              <Route path="*" element={<OverviewPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
