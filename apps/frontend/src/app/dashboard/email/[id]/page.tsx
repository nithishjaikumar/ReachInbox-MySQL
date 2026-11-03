'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEmailDetail, useCancelEmail } from '@/hooks/useEmails';
import { ArrowLeft, Trash2, ChevronDown, ExternalLink } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmailStatusBadge } from '@/components/email/EmailStatusBadge';
import { format } from 'date-fns';
import { sanitizeEmailHtml } from '@/lib/sanitizeEmailHtml';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: email, isLoading, error } = useEmailDetail(id);
  const cancelMutation = useCancelEmail();
  const [safeBody, setSafeBody] = useState('');

  useEffect(() => {
    if (email?.body) setSafeBody(sanitizeEmailHtml(email.body));
    else setSafeBody('');
  }, [email?.body]);

  if (isLoading) {
    return <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  if (error || !email) {
    return <div className="p-8 text-center text-red-500">Failed to load email</div>;
  }

  const senderName = email.sender?.name || 'Unknown Sender';
  const senderEmail = email.sender?.email || 'unknown@example.com';
  const senderInitial = senderName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 truncate">{email.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <EmailStatusBadge status={email.status} date={new Date(email.scheduledAt)} />
          {email.status === 'scheduled' && (
            <button
              onClick={() => cancelMutation.mutate(email.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-4">
            <Avatar name={senderInitial} size="lg" className="bg-green-100 text-green-700" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{senderName}</span>
                <span className="text-sm text-gray-500">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                to {email.recipientEmail}
                <ChevronDown className="w-3 h-3 cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {email.sentAt
              ? format(new Date(email.sentAt), 'MMM d, h:mm a')
              : format(new Date(email.scheduledAt), 'MMM d, h:mm a')
            }
          </div>
        </div>

        <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: safeBody }} />

        {/* Metadata */}
        <div className="mt-8 border-t border-gray-200 pt-6 space-y-3">
          <div className="flex gap-2 text-sm">
            <span className="text-gray-500 w-32">Campaign ID:</span>
            <span className="text-gray-700 font-mono text-xs">{email.campaignId}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-gray-500 w-32">Scheduled At:</span>
            <span className="text-gray-700">{format(new Date(email.scheduledAt), 'PPpp')}</span>
          </div>
          {email.sentAt && (
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-32">Sent At:</span>
              <span className="text-gray-700">{format(new Date(email.sentAt), 'PPpp')}</span>
            </div>
          )}
          {email.errorMessage && (
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-32">Error:</span>
              <span className="text-red-600">{email.errorMessage}</span>
            </div>
          )}
          {email.etherealPreviewUrl && (
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-32">Preview:</span>
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline flex items-center gap-1"
              >
                View on Ethereal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <span className="text-gray-500 w-32">Attempts:</span>
            <span className="text-gray-700">{email.attempts}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
