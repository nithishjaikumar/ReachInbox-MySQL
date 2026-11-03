import React from 'react';

export function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
