import { useState } from 'react'
import api from '../services/api.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      const { accessToken, user } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('role', user.role)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'manager') navigate('/manager')
      else navigate('/driver')
    } catch {
      setError('Login failed')
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto' }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

