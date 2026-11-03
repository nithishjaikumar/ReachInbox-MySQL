'use client';

import React from 'react';
import { EmailRow } from './EmailRow';
import { EmailRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Email } from '@/hooks/useEmails';

interface EmailListProps {
  emails?: Email[];
  isLoading: boolean;
  error?: any;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function EmailList({ emails, isLoading, error, emptyTitle = 'No emails found', emptyDescription }: EmailListProps) {
  if (isLoading) {
    return (
      <div className="w-full">
        {[...Array(5)].map((_, i) => <EmailRowSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load emails'} />;
  }

  if (!emails || emails.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full flex flex-col">
      {emails.map((email) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </div>
  );
}
