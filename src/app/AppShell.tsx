import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageContainer } from '../components/layout'
import GarminLinks from '../features/garmin/GarminLinks'
import LiveBanner from '../features/live/LiveBanner'
import { readPreference, writePreference } from '../lib/preferences'
import AppUpdate from './AppUpdate'
import Header from './Header'
import Sidebar from './Sidebar'
import SideMenu from './SideMenu'
import StoreAlert from './StoreAlert'
import './shell.css'

const COLLAPSED_KEY = 'mm.sidebarCollapsed'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => readPreference(COLLAPSED_KEY) === '1',
  )
  const { pathname } = useLocation()
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    writePreference(COLLAPSED_KEY, next ? '1' : '0')
  }

  return (
    <div className={`app${collapsed ? ' side-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="wrap app-main">
        <Header onMenu={() => setMenuOpen(true)} />
        <main>
          <PageContainer>
            <StoreAlert />
            <LiveBanner />
            <Outlet />
          </PageContainer>
        </main>
      </div>
      <SideMenu open={menuOpen} onClose={closeMenu} />
      <GarminLinks />
      <AppUpdate />
    </div>
  )
}
