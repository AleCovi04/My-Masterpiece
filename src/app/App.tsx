import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import CalendarPage from '../features/calendar/CalendarPage'
import DataPage from '../features/data/DataPage'
import PlannerPage from '../features/planner/PlannerPage'
import OverviewPage from '../features/overview/OverviewPage'
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
              <Route path="planner" element={<PlannerPage />} />
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
