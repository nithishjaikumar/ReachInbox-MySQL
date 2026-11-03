import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function EmailRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-5 flex-1" />
      <Skeleton className="h-4 w-4" />
    </div>
  );
}
