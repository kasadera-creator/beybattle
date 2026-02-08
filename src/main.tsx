import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import './index.css'
import Analytics from './pages/Analytics'
import Home from './pages/Home'
import Practice from './pages/Practice'
import SettingsPage from './pages/Settings'
import TeamDetail from './pages/TeamDetail'
import Teams from './pages/Teams'
import TournamentEvent from './pages/TournamentEvent'
import TournamentEdit from './pages/TournamentEdit'
import TournamentEntries from './pages/TournamentEntries'
import TournamentMode from './pages/TournamentMode'
import TournamentNew from './pages/TournamentNew'
import TournamentResult from './pages/TournamentResult'
import TournamentStart from './pages/TournamentStart'
import PracticeStart from './pages/PracticeStart'
import Users from './pages/Users'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamDetail />} />
          <Route path="/users" element={<Users />} />
          <Route path="/tournament" element={<TournamentMode />} />
          <Route path="/tournament/new" element={<TournamentNew />} />
          <Route path="/tournament/:eventId" element={<TournamentEvent />} />
          <Route path="/tournament/:eventId/entries" element={<TournamentEntries />} />
          <Route path="/tournament/:eventId/edit" element={<TournamentEdit />} />
          <Route path="/tournament/:eventId/start" element={<TournamentStart />} />
          <Route path="/tournament/:eventId/result" element={<TournamentResult />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/start" element={<PracticeStart />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
