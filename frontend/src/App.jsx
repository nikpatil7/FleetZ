import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import Manager from './pages/Manager.jsx'
import Driver from './pages/Driver.jsx'

function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: 8, borderBottom: '1px solid #eee' }}>
        <Link to="/">Home</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="*" element={<div>Not found</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App