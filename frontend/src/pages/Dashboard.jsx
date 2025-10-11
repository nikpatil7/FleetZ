import React from 'react'
import { Truck, Users, Package, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const stats = [
    { name: 'Total Vehicles', value: '24', icon: Truck, change: '+2', changeType: 'positive' },
    { name: 'Active Drivers', value: '18', icon: Users, change: '+3', changeType: 'positive' },
    { name: 'Today Deliveries', value: '45', icon: Package, change: '+5', changeType: 'positive' },
    { name: 'On-time Rate', value: '94%', icon: TrendingUp, change: '+2%', changeType: 'positive' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-sm mt-1 ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} from last week
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {/* Add recent activity list here */}
            <p className="text-gray-500 text-center py-8">Activity feed will appear here</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Performance</h3>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Charts will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard