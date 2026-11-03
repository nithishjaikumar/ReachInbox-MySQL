'use client';

import React, { useState } from 'react';
import { useScheduledEmails, useSearchEmails } from '@/hooks/useEmails';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/email/SearchBar';
import { EmailList } from '@/components/email/EmailList';
import { Clock } from 'lucide-react';

export default function ScheduledPage() {
  const [search, setSearch] = useState('');

  const scheduledQuery = useScheduledEmails(1, 20);
  const searchQuery = useSearchEmails(search, 'scheduled');

  const { data, isLoading, error, refetch } = search.length > 0 ? searchQuery : scheduledQuery;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <Header title="Scheduled Emails">
        <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {data?.total || 0} Scheduled
        </div>
      </Header>

      <SearchBar onSearch={setSearch} onRefresh={refetch} />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={data?.data}
          isLoading={isLoading}
          error={error}
          emptyTitle="No scheduled emails"
          emptyDescription="You don't have any emails scheduled for future delivery."
        />
      </div>
    </div>
  );
}
