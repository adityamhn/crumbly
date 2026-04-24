'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/dashboard/menu', label: 'Menu' },
  { href: '/admin/dashboard/slots', label: 'Slots' },
  { href: '/admin/dashboard/orders', label: 'Orders' },
  { href: '/admin/dashboard/settings', label: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    document.cookie = 'admin_token=; path=/; max-age=0'
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <nav className="bg-white border-b border-pink-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <span className="font-bold text-pink-900 text-lg">Crumbly Admin</span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    pathname === item.href
                      ? 'bg-pink-100 text-pink-900'
                      : 'text-pink-600 hover:text-pink-900 hover:bg-pink-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg ml-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
