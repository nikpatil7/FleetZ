import { useEffect, useRef, useState } from 'react'
import { createSocket } from '../services/socket.js'
import api from '../services/api.js'

export default function Driver() {
  const [sending, setSending] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const socket = createSocket()
    socket.on('connect', () => {})

    async function sendOnce() {
      try {
        setSending(true)
        const coords = await getMockOrBrowserCoords()
        socket.emit('rider:location', { coords })
        await api.post('/tracking/location', { coords })
      } catch (e) {
        // ignore
      } finally {
        setSending(false)
      }
    }

    // send immediately and then every 10s
    sendOnce()
    timerRef.current = setInterval(sendOnce, 10000)

    return () => {
      clearInterval(timerRef.current)
      socket.close()
    }
  }, [])

  return (
    <div>
      <h1>Driver Dashboard</h1>
      <p>{sending ? 'Sending location…' : 'Location idle'}</p>
    </div>
  )
}

async function getMockOrBrowserCoords() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 12.9716, lng: 77.5946 })
      )
    } else {
      resolve({ lat: 12.9716, lng: 77.5946 })
    }
  })
}

