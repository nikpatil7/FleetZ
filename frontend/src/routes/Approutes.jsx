import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Dashboard from '../pages/Dashboard'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="drivers" element={<div>Drivers Page</div>} />
        <Route path="vehicles" element={<div>Vehicles Page</div>} />
        <Route path="deliveries" element={<div>Deliveries Page</div>} />
      </Route>
    </Routes>
  )
}

export default AppRoutes