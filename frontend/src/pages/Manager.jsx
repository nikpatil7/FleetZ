import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { createSocket } from '../services/socket.js'
import api from '../services/api.js'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

export default function Manager() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef(new Map())
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [vehicles, setVehicles] = useState([])

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [77.5946, 12.9716],
        zoom: 11,
      })
    }

    const socket = createSocket()
    socket.on('connect', () => {})
    socket.on('fleet:update', ({ riders }) => {
      if (!Array.isArray(riders)) return
      riders.forEach((r) => {
        const id = r.riderId
        const lng = r.coords?.lng
        const lat = r.coords?.lat
        if (typeof lng !== 'number' || typeof lat !== 'number') return
        const key = String(id)
        let marker = markersRef.current.get(key)
        if (!marker) {
          marker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapInstanceRef.current)
          markersRef.current.set(key, marker)
        } else {
          marker.setLngLat([lng, lat])
        }
      })
    })

    return () => {
      socket.close()
    }
  }, [])

  useEffect(() => {
    async function load() {
      const [ordersRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/orders'),
        api.get('/tracking/drivers'),
        api.get('/vehicles'),
      ])
      setOrders(ordersRes.data.data)
      setDrivers(driversRes.data.data)
      setVehicles(vehiclesRes.data.data)
    }
    load()
  }, [])

  async function assign(orderId, riderId) {
    try {
      setAssigning(true)
      await api.put(`/orders/${orderId}/assign`, { riderId })
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, assignedRiderId: riderId, status: 'assigned' } : o)))
    } finally {
      setAssigning(false)
    }
  }
  async function assignDriverToVehicle(vehicleId, driverId) {
    try {
      setAssigning(true)
      await api.post(`/vehicles/${vehicleId}/assign`, { driverId })
      setVehicles((prev) => prev.map((v) => (v._id === vehicleId ? { ...v, currentDriver: driverId } : v)))
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div>
      <h1>Manager Dashboard</h1>
      <div ref={mapRef} style={{ height: '70vh', width: '100%', border: '1px solid #eee', borderRadius: 8 }} />
      <h2>Unassigned Orders</h2>
      <div>
        {orders.filter((o) => !o.assignedRiderId).map((o) => (
          <div key={o._id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
            <span style={{ minWidth: 200 }}>{o.items?.[0]?.title || 'Order'}</span>
            <select onChange={(e) => assign(o._id, e.target.value)} disabled={assigning} defaultValue="">
              <option value="" disabled>
                Assign driver
              </option>
              {drivers.map((d) => (
                <option key={d._id} value={d.riderId || d._id}>
                  {d.riderId || d._id}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <h2>Vehicles</h2>
      <div>
        {vehicles.map((v) => (
          <div key={v._id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
            <span style={{ minWidth: 160 }}>{v.vehicleNumber} ({v.type})</span>
            <select onChange={(e) => assignDriverToVehicle(v._id, e.target.value)} disabled={assigning} value={v.currentDriver || ''}>
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d._id} value={d.riderId || d._id}>
                  {d.riderId || d._id}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

