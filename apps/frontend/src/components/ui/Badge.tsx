import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'scheduled' | 'sent' | 'failed' | 'processing' | 'cancelled';
  className?: string;
}

export function Badge({ children, variant = 'scheduled', className = '' }: BadgeProps) {
  const variants = {
    scheduled: 'bg-orange-100 text-orange-600',
    sent: 'bg-green-100 text-green-600',
    failed: 'bg-red-100 text-red-600',
    processing: 'bg-blue-100 text-blue-600',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
