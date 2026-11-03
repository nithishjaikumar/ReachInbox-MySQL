'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnContentClick?: boolean;
}

export function Dropdown({ trigger, children, align = 'left', open, onOpenChange, closeOnContentClick = true }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const ref = useRef<HTMLDivElement>(null);
  const setOpen = useCallback((next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <div onClick={() => setOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => { if (closeOnContentClick) setOpen(false); }}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}
