'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useScheduledEmails, useSentEmails } from '@/hooks/useEmails';
import { Clock, Send, Settings, ChevronDown, PenSquare } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const { data: scheduled } = useScheduledEmails(1, 1);
  const { data: sent } = useSentEmails(1, 1);

  const navItems = [
    { name: 'Scheduled', href: '/dashboard/scheduled', icon: Clock, count: scheduled?.total || 0 },
    { name: 'Sent', href: '/dashboard/sent', icon: Send, count: sent?.total || 0 },
  ];

  return (
    <aside className="w-[200px] bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4">
        <div className="font-bold text-2xl tracking-tight mb-8">ONB</div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </div>

        <Link href="/dashboard/compose" className="block w-full text-center py-2 px-4 rounded-full border border-green-500 text-green-600 font-medium hover:bg-green-50 transition-colors mb-6 flex items-center justify-center gap-2">
          <PenSquare className="w-4 h-4" /> Compose
        </Link>
      </div>

      <div className="px-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Core</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
                {item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith('/dashboard/settings') ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </Link>
      </div>
    </aside>
  );
}
