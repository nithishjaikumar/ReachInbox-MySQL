'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SchedulePickerProps {
  onSelect: (date: Date) => void;
  onCancel: () => void;
}

export function SchedulePicker({ onSelect, onCancel }: SchedulePickerProps) {
  const [dateStr, setDateStr] = useState('');
  const minDate = new Date(Date.now() + 60_000);
  const minLocalDateTime = new Date(minDate.getTime() - minDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  const getPreset = (addDays: number, hours: number) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    d.setHours(hours, 0, 0, 0);
    return d;
  };

  const presets = [
    { label: 'Tomorrow', date: getPreset(1, 9) },
    { label: 'Tomorrow, 10:00 AM', date: getPreset(1, 10) },
    { label: 'Tomorrow, 11:00 AM', date: getPreset(1, 11) },
    { label: 'Tomorrow, 3:00 PM', date: getPreset(1, 15) },
  ];

  return (
    <div className="w-[250px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Send Later</h3>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="datetime-local"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            min={minLocalDateTime}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
      </div>

      <div className="py-2 max-h-[200px] overflow-y-auto">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => onSelect(preset.date)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <button type="button" onClick={onCancel} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            if (dateStr) { const selected = new Date(dateStr); if (!Number.isNaN(selected.getTime()) && selected.getTime() > Date.now()) onSelect(selected); }
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
