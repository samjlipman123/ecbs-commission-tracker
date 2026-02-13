'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Download,
  Upload,
  LogOut,
  Building2,
  Wallet,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Projections', href: '/projections', icon: Calendar },
  { name: 'Payments', href: '/actual-payments', icon: Wallet },
  { name: 'Export', href: '/export', icon: Download },
  { name: 'Suppliers', href: '/suppliers', icon: Building2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-[var(--ecbs-navy)] min-h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-[var(--ecbs-navy-light)]">
        <h1 className="text-xl font-bold text-white">ECBS</h1>
        <span className="ml-2 text-sm text-teal-300">Commission Tracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--ecbs-teal)] text-white'
                  : 'text-gray-300 hover:bg-[var(--ecbs-navy-light)] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-4 border-t border-[var(--ecbs-navy-light)]">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-[var(--ecbs-navy-light)] hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
