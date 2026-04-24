'use client'

import { useEffect, useState } from 'react'
import type { PageMode } from '@/lib/types'

interface Analytics {
  total_orders: number
  dd_orders: number
  outside_orders: number
  total_revenue: number
  total_delivery_charges: number
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [pageMode, setPageMode] = useState<PageMode>('closed')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json()),
    ]).then(([analyticsData, settingsData]) => {
      setAnalytics(analyticsData)
      setPageMode(settingsData.page_mode)
      setLoading(false)
    })
  }, [])

  async function updatePageMode(mode: PageMode) {
    setPageMode(mode)
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_mode: mode }),
    })
  }

  if (loading) return <div className="text-center py-12 text-pink-600">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-pink-900 mb-6">Dashboard</h1>

      {/* Page Mode Toggle */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-pink-900 mb-3">Page Mode</h2>
        <div className="flex gap-2">
          {(['closed', 'preorder', 'live'] as PageMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updatePageMode(mode)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                pageMode === mode
                  ? mode === 'closed'
                    ? 'bg-red-100 text-red-800 ring-2 ring-red-300'
                    : mode === 'preorder'
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                    : 'bg-green-100 text-green-800 ring-2 ring-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode === 'preorder' ? 'Pre-order' : mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-pink-500 mt-2">
          {pageMode === 'closed' && 'Customers see a "We\'re closed" message'}
          {pageMode === 'preorder' && 'Customers can pre-order for upcoming delivery slots'}
          {pageMode === 'live' && 'Customers can order for same-day / next-day delivery'}
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Orders" value={analytics.total_orders} />
          <StatCard label="DD Orders" value={analytics.dd_orders} />
          <StatCard label="Outside DD" value={analytics.outside_orders} />
          <StatCard label="Revenue" value={`₹${analytics.total_revenue.toFixed(0)}`} />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-pink-600">{label}</p>
      <p className="text-2xl font-bold text-pink-900 mt-1">{value}</p>
    </div>
  )
}
