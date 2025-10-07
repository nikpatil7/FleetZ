import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function Admin() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/analytics/dashboard')
        setData(res.data.data)
      } catch (e) {
        setError('Failed to load KPIs')
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Kpi title="Total Orders" value={data.totalOrders} />
          <Kpi title="Delivered" value={data.delivered} />
          <Kpi title="Failed/Cancelled" value={data.failed} />
          <Kpi title="Assigned" value={data.assigned} />
          <Kpi title="Drivers" value={data.drivers} />
          <Kpi title="Active Drivers" value={data.activeDrivers} />
          <Kpi title="Vehicles" value={data.vehicles} />
        </div>
      )}
    </div>
  )
}

function Kpi({ title, value }) {
  return (
    <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

