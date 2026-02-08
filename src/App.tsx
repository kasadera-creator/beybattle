import { Link, Outlet, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'ホーム' },
  { to: '/tournament', label: '大会モード' },
  { to: '/practice', label: '練習モード' },
  { to: '/analytics', label: 'データ解析' },
  { to: '/settings', label: '管理' },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
          Beybattle
        </Link>
        <nav className="nav">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                location.pathname === link.to
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
