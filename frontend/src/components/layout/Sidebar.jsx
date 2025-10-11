import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Truck, 
  Users, 
  Package, 
  BarChart3,
  MapPin
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Drivers', href: '/drivers', icon: Users },
    { name: 'Vehicles', href: '/vehicles', icon: Truck },
    { name: 'Deliveries', href: '/deliveries', icon: Package },
    { name: 'Tracking', href: '/tracking', icon: MapPin },
  ]

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800">FleetZ</h1>
        <p className="text-sm text-gray-600">Fleet Management</p>
      </div>
      
      <nav className="mt-6 px-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar