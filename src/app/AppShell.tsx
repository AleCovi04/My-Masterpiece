import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import SideMenu from './SideMenu'
import './shell.css'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <div className="wrap">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="wrap">
          <Outlet />
        </main>
      </div>
      <SideMenu open={menuOpen} onClose={closeMenu} />
    </div>
  )
}
