'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="ml-[200px] h-screen flex flex-col">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
