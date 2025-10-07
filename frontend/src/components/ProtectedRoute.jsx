import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, roles }) {
  const accessToken = localStorage.getItem('accessToken')
  const userRole = localStorage.getItem('role')

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />
    if (userRole === 'manager') return <Navigate to="/manager" replace />
    return <Navigate to="/driver" replace />
  }

  return children
}


