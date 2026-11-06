'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RecipientInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
}

export function RecipientInput({
  emails,
  onChange,
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addEmail = (value: string) => {
    const candidates = value.split(/[;,\s]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    const valid = candidates.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const invalidCount = candidates.length - valid.length;
    const merged = Array.from(new Set([...emails, ...valid]));
    if (merged.length !== emails.length) onChange(merged);
    if (invalidCount > 0) return;
    setInputValue('');
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    }

    if (
      e.key === 'Backspace' &&
      !inputValue &&
      emails.length > 0
    ) {
      onChange(emails.slice(0, -1));
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(
      emails.filter((email) => email !== emailToRemove),
    );
  };

  const displayCount = 3;
  const visibleEmails = emails.slice(0, displayCount);
  const hiddenCount = emails.length - displayCount;

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent min-h-[40px]">
      {visibleEmails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-full text-sm"
        >
          {email}

          <button
            type="button"
            onClick={() => removeEmail(email)}
            className="hover:text-gray-300"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {hiddenCount > 0 && (
        <span className="inline-flex items-center px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
          +{hiddenCount}
        </span>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addEmail(inputValue);
          }
        }}
        placeholder={
          emails.length === 0
            ? 'Add recipients (press Enter or comma)...'
            : ''
        }
        className="flex-1 min-w-[150px] bg-transparent outline-none text-sm px-2 py-1"
      />
    </div>
  );
}