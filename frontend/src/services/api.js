import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

// Auto-refresh on 401
let isRefreshing = false
let pending = []

function onRefreshed(token) {
  pending.forEach((cb) => cb(token))
  pending = []
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const rt = localStorage.getItem('refreshToken')
          if (!rt) throw new Error('no refresh token')
          const res = await api.post('/auth/refresh', { refreshToken: rt })
          const newToken = res.data.data.accessToken
          localStorage.setItem('accessToken', newToken)
          isRefreshing = false
          onRefreshed(newToken)
        } catch {
          isRefreshing = false
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('role')
          return Promise.reject(error)
        }
      }

      return new Promise((resolve) => {
        pending.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }
    return Promise.reject(error)
  }
)


