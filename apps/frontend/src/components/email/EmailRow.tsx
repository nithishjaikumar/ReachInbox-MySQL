'use client';

import React from 'react';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Email } from '@/hooks/useEmails';
import { EmailStatusBadge } from './EmailStatusBadge';

interface EmailRowProps {
  email: Email;
}

export function EmailRow({ email }: EmailRowProps) {
  const router = useRouter();
  const [isStarred, setIsStarred] = React.useState(false);

  const timeToDisplay = email.status === 'sent' && email.sentAt
    ? new Date(email.sentAt)
    : new Date(email.scheduledAt);

  // Strip HTML tags for preview text
  const previewText = email.body
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .substring(0, 100);

  return (
    <div
      onClick={() => router.push(`/dashboard/email/${email.id}`)}
      className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors group"
    >
      <div className="w-[200px] font-medium text-gray-900 truncate shrink-0">
        To: {email.recipientEmail}
      </div>

      <div className="shrink-0 w-[160px]">
        <EmailStatusBadge status={email.status} date={timeToDisplay} />
      </div>

      <div className="flex-1 flex items-center min-w-0">
        <span className="font-medium text-gray-900 truncate mr-2 shrink-0 max-w-[250px]">{email.subject}</span>
        <span className="text-gray-400 truncate flex-1 text-sm">
          {previewText ? `- ${previewText}...` : ''}
        </span>
      </div>

      <div
        className={`shrink-0 px-2 transition-opacity ${isStarred ? 'opacity-100 text-yellow-400' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsStarred(!isStarred);
        }}
        title={isStarred ? 'Unstar' : 'Star'}
      >
        <Star className={`w-4 h-4 cursor-pointer ${isStarred ? 'fill-yellow-400' : 'hover:text-yellow-400'}`} />
      </div>
    </div>
  );
}
