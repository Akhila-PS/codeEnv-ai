import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Landing from './pages/Landing'
import GithubReview from './pages/GithubReview'
import Collab from './pages/Collab'
import EyeCare from './components/EyeCare'

function App() {
  const token = localStorage.getItem('token')
  return (
    <BrowserRouter>
      <EyeCare />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={token ? <Analytics /> : <Navigate to="/login" />} />
        <Route path="/github" element={token ? <GithubReview /> : <Navigate to="/login" />} />
        <Route path="/collab" element={token ? <Collab /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App