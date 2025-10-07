import { io } from 'socket.io-client'

export function createSocket() {
  const token = localStorage.getItem('accessToken')
  const socket = io('/', { auth: { token } })
  return socket
}


