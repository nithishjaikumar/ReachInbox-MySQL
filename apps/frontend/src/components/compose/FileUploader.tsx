'use client';

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploaderProps {
  onEmailsExtracted: (emails: string[]) => void;
  onFileProcessed?: (info: { fileName: string; count: number }) => void;
}

export function FileUploader({ onEmailsExtracted, onFileProcessed }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set(matches));

      if (uniqueEmails.length > 0) {
        onEmailsExtracted(uniqueEmails);
        if (onFileProcessed) {
          onFileProcessed({ fileName: file.name, count: uniqueEmails.length });
        }
        toast.success(`Found ${uniqueEmails.length} unique email addresses in ${file.name}`);
      } else {
        toast.error('No valid email addresses found in file');
      }
    } catch (error) {
      toast.error('Error reading file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv,.txt"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
      >
        <Upload className="w-4 h-4" />
        Upload List
      </button>
    </div>
  );
}
